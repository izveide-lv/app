<template>
  <TabContent class="sidebar-settings" :dark="dark" :show-split="showSplit" @split-close="showSplit = false" @split-closed="handleSplitClosed">
    <section class="wrapper" :class="{ dark }">
      <h1 class="h2">Sidebar</h1>
      <p>The entries below will show up in the same order in the sidebar to the right. Use custom icons and headings to create different sections.</p>
      <MbSortableList v-slot="{ activeItem, index, item: entry }" enable-transitions :items="sidebarOptions" key-name="label" @itemclick="openEntry" @itemmove="handleItemMove">
        <div class="entry" :class="{ active: entryBeingModified === entry, 'being-dragged': activeItem === entry, dark }" tabindex="0" @keydown.space.prevent @keyup.space.enter="openEntry(index)">
          <div class="drag-handle" data-drag-handle>
            <MbIcon icon="drag-handle" />
          </div>
          <MbIcon :icon="entry.icon || (entry.target ? entry.target.name === 'Project.Collection' ? 'folder' : 'document' : entry.label ? 'heading' : 'add-separator')" />
          <span>{{entry.label || 'Separator'}}</span>
          <MbButton v-if="!entry.protected" :dark="dark" data-ignore-drag icon="trash" rounded tooltip="Delete entry" type="negative" @click="deleteEntry(entry)" />
        </div>
      </MbSortableList>
      <transition>
        <footer v-show="!showSplit">
          <MbInput v-model.trim="newEntryLabel" :dark="dark" :error="newEntryError" placeholder="New entry label" @keyup.enter="addEntry" @update:model-value="newEntryError = $event && validateLabel($event)" />
          <MbButton :dark="dark" :disabled="Boolean(newEntryError)" icon="plus" tooltip="Add entry" type="positive" @click="addEntry" />
        </footer>
      </transition>
    </section>
    <template #right>
      <div class="edit-entry" :class="{ dark }">
        <header>
          <h2 :class="{ h3: isMobile }">{{entryError ? entryBeingModified?.label || entryDetails.label || 'Separator' : entryDetails.label || 'Separator'}}</h2>
          <span>Edit sidebar entry</span>
        </header>
        <section v-if="entryDetails.type !== 'separator'">
          <h3>Appearance</h3>
          <div class="input-row">
            <span>Label:</span>
            <MbInput v-model.trim.lazy="entryDetails.label" :dark="dark" :error="entryError" icon="tag" placeholder="Pages" @blur="updateEntry" @update:model-value="entryError = validateLabel($event)" />
          </div>
          <div v-if="entryDetails.type !== 'heading'" class="input-row">
            <span>Icon:</span>
            <MbIconPicker v-model="entryDetails.icon" :dark="dark" removable @update:model-value="updateEntry"/>
          </div>
        </section>
        <section v-if="entryDetails.type !== 'system'">
          <h3>Functionality</h3>
          <div class="input-row">
            <span>Type:</span>
            <MbSelect v-model="entryDetails.type" :dark="dark" :options="[{ label: 'Heading', value: 'heading' }, { label: 'Collection', value: 'collection' }, { label: 'Content item', value: 'content' }, { label: 'Document', value: 'document' }, { label: 'Separator', value: 'separator' }]" @update:model-value="handleTypePick" />
          </div>
          <div v-show="!['heading', 'separator'].includes(entryDetails.type)" class="input-row target">
            <span>Target:</span>
            <MbFilePicker v-if="entryDetails.type === 'collection'" :dark="dark" :filetypes="['json']" :folders-first="false" mode="file" :model-value="entryDetails.target && entryDetails.target.params.path" placeholder="Pick a collection…" pretty-filenames relative-to-root removable :root="collectionsDir" @update:model-value="setEntryTarget" />
            <MbFilePicker v-if="entryDetails.type === 'document'" :dark="dark" :filetypes="['md']" :folders-first="false" mode="file" :model-value="entryDetails.target && entryDetails.target.params.path" placeholder="Pick a document…" pretty-filenames relative-to-root removable :root="`/projects/${currentProject.id}`" @update:model-value="setEntryTarget" />
            <InternalLinkHelper v-if="entryDetails.type === 'content'" allow-unlinkable :collections-path="collectionsDir" :dark="dark" full-path :model-value="entryDetails.target && entryDetails.target.params.path" removable use-file-path @update:model-value="setEntryTarget" />
          </div>
        </section>
        <section v-if="entryDetails.target?.name !== 'Project'">
          <h3>Visibility</h3>
          <MbToggle v-if="!['heading', 'separator'].includes(entryDetails.type)" :dark="dark" :disabled="entryDetails.type === 'heading' || !entryDetails.target" :model-value="entryDetails.showInDashboard" @update:model-value="entryDetails.showInDashboard = $event; updateEntry()">Show as a card on the Dashboard</MbToggle>
          <MbTagInput v-model="entryDetails.limitToRoles" :autocomplete-model="projectRoles" autocomplete-property="label" :dark="dark" label="Limit visibility to (optional)" placeholder="Role(s)" value-property="value" @update:model-value="updateEntry" />
        </section>
      </div>
    </template>
  </TabContent>
</template>

<script>
import { cloneDeep, isEqual } from 'lodash-es';
import fs, { exists, joinPath } from '../../fs';

import availableRoles from '../../data/availableRoles';

import InternalLinkHelper from '../../components/utility/InternalLinkHelper.vue';
import TabContent from '../../components/utility/TabContent.vue';

export default {
  components: {
    InternalLinkHelper,
    TabContent,
  },
  computed: {
    collectionsDir() {
      return `/projects/${this.currentProject.id}/.mattrbld/collections`;
    },
    currentProject() {
      return this.$store.state.currentProject;
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
    projectRoles() {
      return [
        ...availableRoles,
        ...this.$store.state.currentProject.customRoles,
      ];
    },
    sidebarOptions: {
      get() {
        return this.currentProject.sidebar;
      },
      set(v) {
        this.$store.commit('setCurrentProjectProperty', { key: 'sidebar', value: v });
        this.$store.dispatch('saveCurrentProject');
      },
    },
  },
  async created() {
    const dirExists = await exists(this.collectionsDir);
    if (!dirExists) await fs.mkdir(this.collectionsDir);
  },
  data() {
    return {
      entryBeingModified: null,
      entryDetails: {
        icon: null,
        label: null,
        limitToRoles: null,
        target: null,
        type: null,
      },
      entryError: '',
      newEntryError: '',
      newEntryLabel: '',
      showSplit: false,
    };
  },
  methods: {
    addEntry() {
      if (!this.newEntryLabel) this.sidebarOptions = this.sidebarOptions.concat([{ separator: true }]);
      else {
        this.newEntryError = this.validateLabel(this.newEntryLabel);
        if (this.newEntryError) return;

        this.sidebarOptions = this.sidebarOptions.concat([{ icon: null, label: this.newEntryLabel, target: null }]);
      }
      this.newEntryLabel = '';
    },
    deleteEntry(entry) {
      if (entry === this.entryBeingModified) {
        this.showSplit = false;
        this.entryBeingModified = null;
      }
      const backup = entry;
      const entryIndex = this.sidebarOptions.indexOf(entry);

      this.sidebarOptions = this.sidebarOptions.filter((existingEntry) => existingEntry !== entry);
      this.$store.commit('addToast', {
        action: () => {
          // this copying is needed so we don’t modify the sidebarOptions directly since they’re part of the Vuex store
          const shallowCopy = [...this.sidebarOptions];
          shallowCopy.splice(entryIndex, 0, backup);
          this.sidebarOptions = shallowCopy;
        },
        actionLabel: 'Undo',
        closeOnRouteChange: true,
        message: `“${entry.label}” was deleted`,
        timeout: 5000,
        type: 'warning',
      });
    },
    handleItemMove({ activeItem, index, isBottomHalf }) {
      const modelCopy = [...this.sidebarOptions];
      const currentIndex = modelCopy.indexOf(activeItem);
      let newIndex;
      if ((currentIndex < index && isBottomHalf) || (currentIndex > index && !isBottomHalf)) newIndex = index;
      else if (currentIndex < index && !isBottomHalf) newIndex = Math.max(0, index - 1);
      else if (currentIndex > index && isBottomHalf) newIndex = Math.min(index + 1, modelCopy.length - 1);

      modelCopy.splice(newIndex, 0, modelCopy.splice(currentIndex, 1)[0]);
      this.sidebarOptions = modelCopy;
    },
    handleSplitClosed() {
      this.entryDetails = {
        icon: null,
        label: null,
        limitToRoles: null,
        target: null,
        type: null,
      };
      this.entryError = '';
      this.entryBeingModified = null;
    },
    handleTypePick() {
      this.entryDetails.target = null; // reset the target

      if (this.entryDetails.type === 'separator') this.entryError = this.validateLabel(); // to clear any potential errors
      this.updateEntry();
    },
    openEntry(index) {
      const entry = this.sidebarOptions[index];
      if (entry === this.entryBeingModified) this.entryBeingModified = null;
      else {
        this.entryDetails = cloneDeep(entry);
        if (entry.target?.name === 'Project.Collection') this.entryDetails.type = 'collection';
        else if (entry.target?.name === 'Edit Content') this.entryDetails.type = 'content';
        else if (['Project', 'Project.MediaLibrary', 'Project.Settings'].includes(entry.target?.name)) this.entryDetails.type = 'system';
        else if (entry.target) this.entryDetails.type = 'document';
        else if (entry.label) this.entryDetails.type = 'heading';
        else this.entryDetails.type = 'separator';
        this.entryBeingModified = entry;
      }
    },
    setEntryTarget(path, collection) {
      if (path === null) this.entryDetails.target = null;
      else if (this.entryDetails.type === 'document') this.entryDetails.target = { name: 'Project.Documentation', params: { path } };
      else if (this.entryDetails.type === 'content') this.entryDetails.target = { name: 'Edit Content', params: { collection, path } };
      else if (this.entryDetails.type === 'collection') this.entryDetails.target = { name: 'Project.Collection', params: { path: joinPath('/.mattrbld/collections', path) } };
      this.updateEntry();
    },
    updateEntry() {
      if (this.entryError) return;
      const shallowCopy = [...this.sidebarOptions];
      const entryIndex = shallowCopy.indexOf(this.entryBeingModified);
      let modifiedEntry = cloneDeep(this.entryDetails);

      if (modifiedEntry.type === 'separator') modifiedEntry = { limitToRoles: modifiedEntry.limitToRoles, separator: true };
      else delete modifiedEntry.type;

      if (isEqual(modifiedEntry, this.entryBeingModified)) return;

      if (entryIndex > -1) shallowCopy.splice(entryIndex, 1, modifiedEntry);
      this.entryBeingModified = modifiedEntry;
      this.sidebarOptions = shallowCopy;
    },
    validateLabel(label) {
      if (this.entryDetails?.type === 'separator') return '';
      if (!label) return 'A label is required';
      if ((!this.entryBeingModified || label !== this.entryBeingModified.label) && this.sidebarOptions.find((option) => option.label === label)) return 'An entry with this label already exists';
      return '';
    },
  },
  props: {
    dark: Boolean,
  },
  watch: {
    entryBeingModified(nv) {
      if (nv !== null) this.showSplit = true;
      else this.showSplit = false;
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .sidebar-settings {
    user-select: none;

    .wrapper {
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      footer {
        margin-top: 1.5rem;
        display: flex;
        align-items: center;

        &.v-enter-active,
        &.v-leave-active {
          transition: opacity 200ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
          }
        }

        .input {
          margin-top: 0;
          margin-right: 0.5rem;
          flex-grow: 1;
        }
      }
    }
  }

  .entry {
    display: flex;
    align-items: center;
    border-radius: var(--radius-m);
    flex-grow: 1;
    overflow: hidden;
    background-color: var(--bg-secondary);
    margin-bottom: 0.5rem;
    padding-right: 0.25rem;
    cursor: pointer;
    position: relative;
    transition: background-color 200ms ease;

    &:hover {
      background-color: var(--bg-tertiary);
    }

    &:focus-visible::before {
      opacity: 1;
    }

    &:active {
      transform: translateY(0.125rem);
    }

    &.dark {
      background-color: var(--bg-secondary-dark);

      &:hover {
        background-color: var(--bg-tertiary-dark);
      }
    }

    &.active {
      background-color: var(--accent);
      color: var(--text-dark);

      &:hover,
      &:focus-visible {
        background-color: var(--accent-darkened-5);
      }
    }

    &.being-dragged {
      opacity: 0.25;
    }

    &::before {
      content: '';
      position: absolute;
      top: 0px;
      left: 0px;
      right: 0px;
      bottom: 0px;
      border: 2px solid var(--accent);
      opacity: 0;
      border-radius: var(--radius-m);
      z-index: 1;
      pointer-events: none;
      transition: opacity 200ms ease;
    }

    .drag-handle {
      padding: 1rem;
      cursor: move;
    }

    .button {
      flex-shrink: 0;
    }

    > .icon:not(.button) {
      margin-right: 0.5rem;
    }

    > span {
      flex-grow: 1;
    }
  }

  .edit-entry {
    &.dark {
      header span,
      section h3 {
        color: var(--text-secondary-dark);
      }

      .input,
      .icon-picker,
      .file-picker,
      .tag-input {
        background-color: var(--bg-tertiary-dark);
      }

      .internal-link-helper:deep(.view) {
        &.url,
        &.collections ul li:not(:last-child) {
          background-color: var(--bg-tertiary-dark);

          &:hover {
            background-color: var(--bg-tertiary-dark-lightened-5);
          }
        }

        &.files {
          .input {
            background-color: var(--bg-tertiary-dark);
          }

          .file-list {
            .files {
              background-color: var(--bg-secondary-dark);

              .file {
                background-color: var(--bg-tertiary-dark);

                &:hover {
                  background-color: var(--bg-tertiary-dark-lightened-5);
                }

                &:active {
                  background-color: var(--bg-secondary-dark);
                }
              }
            }
          }
        }
      }
    }

    > header {
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
        color: var(--text-secondary);
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

      h3 {
        color: var(--text-secondary);

        + .tag-input {
          margin-top: 2rem;
        }
      }

      .input-row {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;

        &.target {
          > span:first-child {
            align-self: flex-start;
            margin-top: 1rem;
          }
        }

        @media #{$mobile} {
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }

        > span:first-child {
          margin-right: auto;
          white-space: nowrap;
        }

        > :last-child:not(:only-child) {
          margin-left: 1rem;
          width: 100%;
          max-width: rem(400);

          @media #{$mobile} {
            margin-left: 0;
            margin-top: 0.5rem;
            width: 100%;
          }
        }

        > .input {
          margin-top: 0;
        }
      }

      > .toggle:not(:last-child) {
        margin-bottom: 2rem;
      }
    }
  }
</style>
