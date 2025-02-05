<template>
  <div class="file-list" :class="{ dark }">
    <header>
      <nav>
        <MbButton :dark="dark" :disabled="currentPath === root" icon="chevron-left" rounded @click="back" />
        <p class="breadcrumb">
          <template v-for="(step, index) in breadcrumb" :key="index">
            <span class="step" :class="{ active: index === breadcrumb.length - 1 }" @click="jumpTo(index)">{{prettyFilenames ? prettify(step) : step}}</span>
            <span v-if="index !== breadcrumb.length - 1" class="separator">/</span>
          </template>
        </p>
      </nav>
      <div v-if="filterable || sortable || action" class="actions">
        <MbInput v-if="filterable" clearable :dark="dark" icon="search" label="Search current directory" type="search" :model-value="searchTerm" @update:model-value="debouncedSearch" />
        <div v-if="sortable" class="sort">
          <span class="select-label">Sort by:</span>
          <MbSelect v-model="sortBy" :dark="dark" :options="sortOptions" @update:model-value="sortEntities" />
          <MbButton class="mobile-sort-by" :dark="dark" :icon="sortBy === 'name' ? 'text-alt' : 'calendar'" :tooltip="{ position: 'right', message: sortBy === 'name' ? 'By name' : 'By date' }" @click="sortBy === 'name' ? sortBy = 'edited' : sortBy = 'name'; sortEntities()"/>
          <MbButton :dark="dark" :icon="reverseOrder ? 'descending' : 'ascending'" :tooltip="{ position: 'right', message: reverseOrder ? 'Descending' : 'Ascending' }" @click="reverseOrder = !reverseOrder; sortEntities()"/>
        </div>
        <MbButton v-if="action && (action.label || action.icon) && action.callback" class="action" :dark="dark" :icon="action.icon" :icon-first="action.iconFirst !== false" :loading="action.loading" :tooltip="action.tooltip" :type="action.type" @click="action.callback(currentPath)">{{action.label}}</MbButton>
      </div>
    </header>
    <MbScroller v-show="filteredFolders.length > 0" class="folder-scroller" ref="folderWrapper">
      <transition-group class="folder-wrapper" tag="div" @after-enter="updateOffsets" @after-leave="updateOffsets" @before-leave="setRowPosition">
        <div v-for="folder in filteredFolders" class="folder" :class="{ 'no-actions': modifiedFolderActions.length === 0 }" :key="folder.name" tabindex="0" @click="openFolder(folder.name, $event)" @contextmenu.prevent="openMenu($event, joinPath(currentPath, folder.name), true)" @keyup.space.enter="openFolder(folder.name, $event)" @keydown.space.prevent>
          <header>
            <MbIcon icon="folder"  />
            <MbButton v-if="modifiedFolderActions.length > 1" :dark="dark" icon="more-vertical" rounded tooltip="More" @click="openMenu($event, joinPath(currentPath, folder.name), true)" />
            <MbButton v-else-if="modifiedFolderActions.length === 1" :dark="dark" :icon="modifiedFolderActions[0].icon" rounded :tooltip="modifiedFolderActions[0].label" :type="modifiedFolderActions[0].type" @click="executeAction(modifiedFolderActions[0].action, joinPath(currentPath, folder.name))" />
          </header>
          <p @mouseenter="showNameTooltip($event, folder.name)"><span v-show="folder.localChanges" class="local-changes-indicator"/><span>{{prettyFilenames ? prettify(folder.name) : folder.name}}</span></p>
          <p class="meta">{{formattedUpdatedAt(folder.updatedAt)}}</p>
        </div>
      </transition-group>
    </MbScroller>
    <p v-if="foldersFirst && !foldersOnly" class="h3">{{fileListLabel}}</p>
    <transition-group v-if="!thumbnails" v-show="filteredFiles.length > 0" class="files" tag="ul">
      <li v-for="file in filteredFiles" class="file" :class="{ active: activeFile === joinPath(currentPath, file.name), 'no-actions': modifiedFileActions.length === 0 }" :key="file.isDraft ? `${file.name}-draft` : file.name" tabindex="0" @click="file.isFolder ? openFolder(file.name, $event) : handleFileClick(file.name, $event, file.isDraft)" @contextmenu.prevent="openMenu($event, joinPath(file.isDraft ? cleanDraftsDir : currentPath, file.name), file.isFolder)" @keyup.space.enter="file.isFolder ? openFolder(file.name, $event) : handleFileClick(file.name, $event, file.isDraft)" @keydown.space.prevent>
        <MbIcon :icon="file.isFolder ? 'folder' : entityIcon(file.name)" />
        <span v-show="file.localChanges" class="local-changes-indicator"/>
        <span>{{prettyFilenames ? prettify(file.name) : file.name}}</span>
        <MbChip v-if="file.isDraft" color="accent" label="Draft" />
        <span class="meta">{{formattedUpdatedAt(file.updatedAt)}}</span>
        <MbButton v-if="modifiedFileActions.length > 1" :dark="dark" icon="more-vertical" rounded tooltip="More" @click="openMenu($event, joinPath(file.isDraft ? cleanDraftsDir : currentPath, file.name), file.isFolder)" />
        <MbButton v-else-if="modifiedFileActions.length === 1" :dark="dark" :icon="modifiedFileActions[0].icon" rounded :tooltip="modifiedFileActions[0].label" :type="modifiedFileActions[0].type" @click="executeAction(modifiedFileActions[0].action, joinPath(file.isDraft ? cleanDraftsDir : currentPath, file.name))" />
      </li>
    </transition-group>
    <transition-group v-else v-show="filteredFiles.length > 0 && !leaving" class="files thumbnails" ref="fileWrapper" tag="ul" @after-enter="updateFileOffsets" @after-leave="updateFileOffsets" @before-leave="setGridPosition">
      <li v-for="file in filteredFiles" class="file" :class="{ active: activeFile === joinPath(currentPath, file.name), 'no-actions': modifiedFileActions.length === 0 }" :key="file.isDraft ? `${file.name}-draft` : file.name" tabindex="0" @click="file.isFolder ? openFolder(file.name, $event) : handleFileClick(file.name, $event, file.isDraft, file.size, imageCache.get(joinPath(currentPath, file.name)))" @contextmenu.prevent="openMenu($event, joinPath(file.isDraft ? cleanDraftsDir : currentPath, file.name), file.isFolder)" @keyup.space.enter="file.isFolder ? openFolder(file.name, $event) : handleFileClick(file.name, $event, file.isDraft, file.size, imageCache.get(joinPath(currentPath, file.name)))" @keydown.space.prevent>
        <div class="thumbnail">
          <transition appear>
            <img v-if="imageCache.has(joinPath(currentPath, file.name))" alt="Image thumbnail" class="hidden" draggable="false" :src="imageCache.get(joinPath(currentPath, file.name))" @load="$event.target.classList.remove('hidden')">
            <MbIcon v-else :icon="file.isFolder ? 'folder' : entityIcon(file.name)" />
          </transition>
        </div>
        <footer>
          <div class="left">
            <header @mouseenter="showNameTooltip($event, file.name)">
              <span v-show="file.localChanges" class="local-changes-indicator"/>
              <span>{{prettyFilenames ? prettify(file.name) : file.name}}</span>
              <MbChip v-if="file.isDraft" color="accent" label="Draft" />
            </header>
            <span class="meta">{{formattedUpdatedAt(file.updatedAt)}}, {{file.size}}, {{file.isFolder ? 'Folder' : file.name.slice(file.name.lastIndexOf('.') + 1).toUpperCase()}}</span>
          </div>
          <MbButton v-if="modifiedFileActions.length > 1" :dark="dark" icon="more-vertical" rounded tooltip="More" @click="openMenu($event, joinPath(file.isDraft ? cleanDraftsDir : currentPath, file.name), file.isFolder)" />
          <MbButton v-else-if="modifiedFileActions.length === 1" :dark="dark" :icon="modifiedFileActions[0].icon" rounded :tooltip="modifiedFileActions[0].label" :type="modifiedFileActions[0].type" @click="executeAction(modifiedFileActions[0].action, joinPath(file.isDraft ? cleanDraftsDir : currentPath, file.name))" />
        </footer>
      </li>
    </transition-group>
    <transition>
      <p v-show="filteredFiles.length === 0 && ((foldersFirst && !foldersOnly) || filteredFolders.length === 0)" class="empty-state" v-html="searchTerm ? 'No results…' : emptyStateMessage" />
    </transition>
    <MbContextMenu class="options" :dark="dark" :from-right="popover.fromRight" :options="popover.isFolder ? modifiedFolderActions : modifiedFileActions" :show="popover.show" :target="popover.target" :x="popover.x" :y="popover.y" @close="popover.show = false" />
  </div>
</template>

<script>
import { formatDistanceToNowStrict } from 'date-fns';
import { debounce } from 'lodash-es';

import fs, { pathDirname, joinPath } from '../fs';
import humanReadableSize from '../assets/js/humanReadableSize';
import prettifyEntityName from '../assets/js/prettifyEntityName';

import { archiveRegExp, imageRegExp, videoRegExp } from '../data/regExps';

export default {
  beforeUnmount() {
    if (this.observer) this.observer.disconnect();
    if (this.imageCache.size > 0) {
      this.imageCache.forEach((url) => URL.revokeObjectURL(url));
    }
  },
  computed: {
    breadcrumb() {
      const rootName = this.root.split('/').slice(-1)[0] || 'Root';
      if (this.currentPath === this.root) return [rootName];

      let steps;
      if (this.root !== '/') steps = this.currentPath.replace(this.root, '').split('/').slice(1);
      else steps = this.currentPath.split('/').slice(1);

      return [rootName, ...steps].slice(-4); // so it doesn’t get too long
    },
    cleanDraftsDir() {
      if (!this.draftsDir) return null;
      return joinPath(this.draftsDir, this.currentPath.replace(this.root, ''));
    },
    emptyStateMessage() {
      if (typeof this.emptyState === 'string') return this.emptyState;
      if (this.foldersFirst && !this.foldersOnly) return this.emptyState.noFiles;
      if (this.foldersOnly) return this.emptyState.noFolders;
      return this.emptyState.empty;
    },
    filteredFiles() {
      if (!this.searchTerm) return this.files.filter((file) => !this.$store.getters.isSoftDeleted(joinPath(file.isDraft ? this.cleanDraftsDir : this.currentPath, file.name)));
      return this.files.filter((file) => file.name.toLowerCase().includes(this.searchTerm.toLowerCase()) && !this.$store.getters.isSoftDeleted(joinPath(file.isDraft ? this.cleanDraftsDir : this.currentPath, file.name)));
    },
    filteredFolders() {
      if (!this.searchTerm) return this.folders.filter((folder) => !this.$store.getters.isSoftDeleted(joinPath(this.currentPath, folder.name)));
      return this.folders.filter((folder) => folder.name.toLowerCase().includes(this.searchTerm.toLowerCase()) && !this.$store.getters.isSoftDeleted(joinPath(this.currentPath, folder.name)));
    },
    modifiedFileActions() { // we need to pass the current filepath to the callback and check if it’s applicable for this type
      const actions = [];

      if (this.fileActions.length === 0) return this.fileActions;

      this.fileActions.forEach((action) => {
        if (!action.foldersOnly) actions.push({ ...action, action: () => action.action(this.currentFile) });
      });

      return actions;
    },
    modifiedFolderActions() { // we need to pass the current filepath to the callback and check if it’s applicable for this type
      const actions = [];

      if (this.fileActions.length === 0) return this.fileActions;

      this.fileActions.forEach((action) => {
        if (!action.filesOnly) actions.push({ ...action, action: () => action.action(this.currentFile) });
      });

      return actions;
    },
    showBack() {
      return this.currentPath !== this.root;
    },
  },
  created() {
    this.sortBy = this.initialSortBy;
    this.reverseOrder = this.initialReverseSortOrder;
    this.currentPath = this.initialPath || this.root;
  },
  data() {
    return {
      archiveRegExp,
      currentFile: null,
      currentPath: null,
      files: [],
      folders: [],
      imageCache: new Map(),
      imageRegExp,
      joinPath,
      leaving: false,
      loading: false,
      observer: null,
      pagination: {
        currentPage: 0,
        pageSize: 6,
        totalPages: 0,
      },
      popover: {
        isFolder: false,
        show: false,
        target: null,
        x: 0,
        y: 0,
      },
      searchTerm: '',
      sortBy: null,
      sortOptions: [
        {
          label: 'Name',
          value: 'name',
        },
        {
          label: 'Last Edited',
          value: 'edited',
        },
      ],
      reverseOrder: false,
      videoRegExp,
    };
  },
  emits: ['fileclick', 'list-change', 'path-change'],
  methods: {
    back() {
      if (this.currentPath === this.root) return;
      const newPath = this.currentPath.substring(0, this.currentPath.lastIndexOf('/'));
      this.currentPath = newPath || '/';
    },
    debouncedSearch: debounce(function (v) { // eslint-disable-line func-names
      this.searchTerm = v;
      if (this.thumbnails) {
        this.pagination.currentPage = 0;
        this.fetchThumbnails();
      }
    }, 250),
    entityIcon(name) {
      if (this.imageRegExp.test(name)) return 'image';
      if (this.videoRegExp.test(name)) return 'video-camera';
      if (this.archiveRegExp.test(name)) return 'folder-archive';
      return 'document';
    },
    executeAction(action, path) {
      this.currentFile = path;
      action();
    },
    async fetchData() {
      try {
        let drafts = [];

        if (this.cleanDraftsDir) {
          try {
            const draftNames = await fs.readdir(this.cleanDraftsDir);
            const draftStats = await Promise.all(draftNames.map((name) => fs.stat(joinPath(this.cleanDraftsDir, name))));
            drafts = draftNames.reduce((acc, name, index) => {
              if (!draftStats[index].isDirectory()) {
                acc.push({
                  isDraft: true,
                  isFolder: false,
                  localChanges: this.$store.getters.hasLocalChanges(joinPath(this.cleanDraftsDir, name)),
                  name,
                  size: humanReadableSize(draftStats[index].size),
                  updatedAt: draftStats[index].mtimeMs,
                });
              }
              return acc;
            }, []);
          } catch (err) {
            if (err.code !== 'ENOENT') throw err;
          }
        }

        const contents = await fs.readdir(this.currentPath);

        const statPromises = [];
        contents.forEach((entity) => statPromises.push(fs.stat(`${this.currentPath}/${entity}`)));
        const stats = await Promise.all(statPromises);
        const entities = contents.map((name, index) => ({
          isDraft: false,
          isFolder: stats[index].isDirectory(),
          localChanges: this.$store.getters.hasLocalChanges(`${this.currentPath}/${name}`),
          name,
          size: humanReadableSize(stats[index].size),
          updatedAt: stats[index].mtimeMs,
        })).concat(drafts);

        entities.sort((a, b) => {
          let nameA;
          let nameB;
          switch (this.sortBy) {
            case 'edited':
              if (!this.reverseOrder) return a.updatedAt - b.updatedAt;
              return b.updatedAt - a.updatedAt;
            case 'name':
            default:
              nameA = a.name.toUpperCase();
              nameB = b.name.toUpperCase();
              if (nameA > nameB) return !this.reverseOrder ? 1 : -1;
              if (nameA < nameB) return !this.reverseOrder ? -1 : 1;
              return 0;
          }
        });

        this.folders = [];
        this.files = [];
        if (this.foldersOnly && this.foldersFirst) this.folders = entities.filter((entity) => (this.showHidden || !entity.name.startsWith('.')) && entity.isFolder && entity.name !== '.git');
        else if (this.foldersOnly && !this.foldersFirst) this.files = entities.filter((entity) => (this.showHidden || !entity.name.startsWith('.')) && entity.isFolder && entity.name !== '.git');
        else if (!this.foldersFirst) this.files = entities.filter((entity) => (this.showHidden || !entity.name.startsWith('.')) && entity.name !== '.git').sort((a, b) => b.isFolder - a.isFolder); // subtracting booleans from each other works to return -1, 1, or 0 respectively…for some reason
        else if (this.showHidden) {
          entities.forEach((entity) => {
            if (entity.isFolder && entity.name !== '.git') this.folders.push(entity);
            else if (!entity.isFolder) this.files.push(entity);
          });
        } else {
          entities.forEach((entity) => {
            if (entity.name.startsWith('.')) return;
            if (entity.isFolder) this.folders.push(entity);
            else this.files.push(entity);
          });
        }
        if (!this.foldersOnly && (this.onlyImages || (this.filetypes && this.filetypes.length > 0))) {
          const allowedEndingsRegex = this.onlyImages ? this.imageRegExp : new RegExp(`\\.(${this.filetypes.join('|')})$`, 'i');
          this.files = this.files.filter((file) => file.isFolder || allowedEndingsRegex.test(file.name));
        }

        this.leaving = false;
        if (this.thumbnails) this.$nextTick(() => this.fetchThumbnails());
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while reading files: ${err.message}`, type: 'error' });
        if (this.currentPath !== this.root) this.currentPath = pathDirname(this.currentPath);
      }
    },
    async fetchThumbnails() {
      if (!this.thumbnails || this.files.length === 0) return;

      if (!this.observer) {
        this.observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            this.observer.unobserve(entries[0].target);
            if (this.pagination.currentPage < this.pagination.totalPages) this.fetchThumbnails();
          }
        });
      }

      const nextPage = this.pagination.currentPage + 1;

      const entities = this.filteredFiles.slice(this.pagination.currentPage * this.pagination.pageSize, nextPage * this.pagination.pageSize);
      const images = entities.reduce((acc, entity) => {
        const path = joinPath(this.currentPath, entity.name);
        if (!entity.isFolder && this.imageRegExp.test(entity.name) && !this.imageCache.has(path)) acc.push(path);
        return acc;
      }, []);
      const imageData = await Promise.all(images.map((path) => fs.readFile(path)));
      images.forEach((path, i) => this.imageCache.set(path, URL.createObjectURL(new Blob([imageData[i]], path.endsWith('.svg') ? { type: 'image/svg+xml' } : undefined))));

      if (this.pagination.totalPages === 0) { // first run
        this.pagination.totalPages = Math.ceil(this.filteredFiles.length / this.pagination.pageSize);
        const files = this.$refs.fileWrapper.$el.querySelectorAll('li:not(.v-leave-active)'); // we need only the new files, not those of the previous path (which are still leaving at this point)
        const nextTarget = files[this.pagination.pageSize];
        if (nextTarget) this.observer.observe(nextTarget);
      } else if (this.pagination.currentPage < this.pagination.totalPages) {
        const files = this.$refs.fileWrapper.$el.querySelectorAll('li:not(.v-leave-active)'); // we need only the new files, not those of the previous path (which are still leaving at this point)
        const nextTarget = files[nextPage * this.pagination.pageSize];
        if (nextTarget) this.observer.observe(nextTarget);
      }

      this.pagination.currentPage = nextPage;
    },
    formattedUpdatedAt(updatedAt) {
      const distance = formatDistanceToNowStrict(updatedAt, { addSuffix: true });
      if (distance !== '0 seconds ago') return distance;
      return 'just now';
    },
    handleFileClick(name, e, isDraft, size, imageUrl) {
      if (e.target.classList.contains('button')) return; // buttons have a ::before that covers them completely, so this is enough
      this.$emit('fileclick', joinPath(isDraft ? this.cleanDraftsDir : this.currentPath, name), size, imageUrl);
    },
    jumpTo(index) {
      if (this.currentPath === this.root) return;
      let steps;
      if (this.root !== '/') steps = this.currentPath.replace(this.root, '').split('/');
      else steps = this.currentPath.split('/');
      // the index is a number between 0 and 3, representing the point clicked  in the breadcrumb (max-length: 4)
      // we want the path from the start of the path up to that number, but since the path might be longer than 4, we have to offset it by the difference
      // also the index has to be +1 because the end of slice() is non-inclusive
      const newPath = steps.slice(0, steps.length - Math.min(steps.length, 4) + index + 1);
      this.currentPath = joinPath(this.root, ...newPath.slice(1)); // strip the leading empty string (since currentPath always starts with a slash)
    },
    openFolder(name, e) {
      if (e && e.target.classList.contains('button')) return; // buttons have a ::before that covers them completely, so this is enough
      this.currentPath = joinPath(this.currentPath, name);
    },
    openMenu(e, path, isFolder) {
      if (this.popover.show || (isFolder && this.modifiedFolderActions.length < 1) || (!isFolder && this.modifiedFileActions.length < 1)) return; // close it first or abort if there’s nothing to display
      this.currentFile = path;
      if (e.type === 'contextmenu') {
        this.popover.x = e.clientX;
        this.popover.y = e.clientY;
        this.popover.fromRight = false;
      } else {
        const rect = e.target.getBoundingClientRect();
        this.popover.fromRight = true;
        this.popover.x = rect.right;
        this.popover.y = rect.top;
      }
      this.popover.isFolder = isFolder;
      this.popover.target = e.currentTarget;
      this.popover.show = true;
    },
    prettify(name) {
      return prettifyEntityName(name);
    },
    async refresh() {
      this.pagination.currentPage = 0;
      this.pagination.totalPages = 0;
      await this.fetchData();
    },
    replaceThumbnail(path, url) {
      const oldUrl = this.imageCache.get(path);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      this.imageCache.set(path, url);
    },
    setGridPosition(el) {
      el.style.setProperty('top', `${el.dataset.offsetTop}px`);
      el.style.setProperty('left', `${el.dataset.offsetLeft}px`);
      el.style.setProperty('width', `${el.offsetWidth}px`);
      el.style.setProperty('height', `${el.offsetHeight}px`);
      el.style.setProperty('margin', '0');
      el.style.setProperty('position', 'absolute');
    },
    setRowPosition(el) {
      el.style.setProperty('left', `${el.dataset.offsetLeft}px`);
      el.style.setProperty('position', 'absolute');
    },
    showNameTooltip(e, name) {
      if (!name) return;

      const tooltip = {
        message: name,
        target: e.currentTarget,
      };
      this.$store.commit('setTooltip', tooltip);
    },
    sortEntities(type) {
      if (!type || !['files', 'folders'].includes(type)) {
        this.sortEntities('files');
        if (this.foldersFirst) this.sortEntities('folders');
        return;
      }

      this[type].sort((a, b) => {
        let nameA;
        let nameB;
        switch (this.sortBy) {
          case 'edited':
            if (!this.reverseOrder) return a.updatedAt - b.updatedAt;
            return b.updatedAt - a.updatedAt;
          case 'name':
          default:
            nameA = a.name.toUpperCase();
            nameB = b.name.toUpperCase();
            if (nameA > nameB) return !this.reverseOrder ? 1 : -1;
            if (nameA < nameB) return !this.reverseOrder ? -1 : 1;
            return 0;
        }
      });

      // OPTIMIZE: this could probably be factored into the sort above to avoid iterating over everything twice, but all the solutions I could come up with were much less readable, so I went with this instead
      if (!this.foldersFirst || !this.foldersOnly) this[type].sort((a, b) => b.isFolder - a.isFolder); // we want folders listed before files, but in the same list

      if (this.thumbnails) {
        this.pagination.currentPage = 0; // reset pagination
        this.fetchThumbnails(); // and fetch thumbnails again since the observers broke when shuffling everything around
      }
    },
    updateOffsets: debounce(function () { // eslint-disable-line func-names
      if (!this.$refs.folderWrapper) return;
      this.$refs.folderWrapper.$el.querySelectorAll('.folder').forEach((el) => {
        el.dataset.offsetLeft = el.offsetLeft; // eslint-disable-line no-param-reassign
      });
    }),
    updateFileOffsets: debounce(function () { // eslint-disable-line func-names
      if (!this.$refs.fileWrapper) return;
      this.$refs.fileWrapper.$el.querySelectorAll('.file').forEach((el) => {
        el.dataset.offsetLeft = el.offsetLeft; // eslint-disable-line no-param-reassign
        el.dataset.offsetTop = el.offsetTop; // eslint-disable-line no-param-reassign
      });
    }),
  },
  props: {
    action: Object,
    activeFile: String,
    dark: Boolean,
    draftsDir: String,
    emptyState: {
      type: [String, Object],
      default: () => ({
        noFiles: 'There are no files in this directory',
        noFolders: 'There are no folders in this directory',
        empty: 'This directory is empty',
      }),
    },
    fileActions: {
      type: Array,
      default: () => [],
    },
    fileListLabel: {
      type: String,
      default: 'Files',
    },
    filetypes: Array,
    filterable: {
      type: Boolean,
      default: true,
    },
    foldersFirst: {
      type: Boolean,
      default: true,
    },
    foldersOnly: Boolean,
    initialPath: String,
    initialSortBy: {
      type: String,
      default: 'name',
    },
    initialReverseSortOrder: Boolean,
    onlyImages: Boolean,
    prettyFilenames: Boolean,
    root: {
      type: String,
      default: '/',
    },
    showHidden: Boolean,
    sortable: {
      type: Boolean,
      default: true,
    },
    thumbnails: Boolean,
  },
  watch: {
    currentPath(nv, ov) {
      if (nv !== ov) {
        this.leaving = true; // to short-circuit the leave-transition by hiding the container element when thumbnails is true
        this.searchTerm = '';
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
          this.pagination.currentPage = 0;
          this.pagination.totalPages = 0;
        }
        this.fetchData();
        if (this.$refs.folderWrapper) this.$refs.folderWrapper.$refs.scrollArea.scrollTo({ left: 0 });
        this.$emit('path-change', nv);
      }
    },
    filteredFolders(nv, ov) {
      if (nv !== ov) this.$emit('list-change', { files: this.filteredFiles.length, folders: this.filteredFolders.length });
    },
    filteredFiles(nv, ov) {
      if (nv !== ov) this.$emit('list-change', { files: this.filteredFiles.length, folders: this.filteredFolders.length });
    },
    root(nv) {
      this.currentPath = nv;
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .file-list {
    user-select: none;

    &.dark {
      header {
        nav > .breadcrumb {
          color: var(--text-secondary-dark);

          span {
            &.step:hover {
              color: var(--text-dark);
            }
          }
        }
      }

      .folder-wrapper .folder {
        background-color: var(--bg-secondary-dark);

        &:hover {
          background-color: var(--bg-tertiary-dark);
        }

        p.meta {
          color: var(--text-secondary-dark);
        }
      }

      .files li {
        background-color: var(--bg-secondary-dark);

        &:hover {
          background-color: var(--bg-tertiary-dark);
        }

        span.meta {
          color: var(--text-secondary-dark);
        }
      }

      .files.thumbnails li .thumbnail {
        background-image: linear-gradient(to right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)), linear-gradient(to right, black 50%, white 50%), linear-gradient(to bottom, black 50%, white 50%);
      }

      .empty-state {
        color: var(--text-secondary-dark);

        &.v-enter-active {
          transition: opacity 200ms ease;

          &.v-enter-from {
            opacity: 0;
          }
        }

        &.v-leave-active {
          display: none;
        }
      }

      .folder-wrapper .folder,
      .files li {
        &:active {
          background-color: var(--bg-dark);
        }
      }
    }

    header {
      margin-bottom: 1rem;
      nav {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;

        &:only-child {
          margin-bottom: 0;
        }

        .button {
          margin-right: 0.5rem;
        }

        > .breadcrumb {
          font-weight: 700;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;

          span {
            &.step {
              cursor: pointer;
              transition: color 200ms ease;

              &.active {
                color: var(--accent);
              }

              &:hover {
                color: var(--text);
              }
            }

            &.separator {
              margin: 0 0.5rem;
            }
          }
        }
      }

      .actions {
        display: flex;
        align-items: center;

        @media #{$mobile} {
          flex-wrap: wrap;
        }

        .input {
          margin-top: 0;
          margin-right: 4rem;
          flex-grow: 1;
          max-width: rem(512);

          @media #{$mobile} {
            margin-right: 0;
            max-width: none;
            width: 100%;
            margin-bottom: 1rem;
          }
        }

        .sort {
          margin-left: auto;
          white-space: nowrap;

          @media #{$mobile} {
            margin-bottom: 1rem;
          }

          .select-label {
            margin-right: 0.5rem;
            white-space: nowrap;

            @media #{$mobile} {
              display: none;
            }
          }

          &:deep(.select) {
            min-width: 10rem;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;

            &::before {
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
            }

            @media #{$mobile} {
              display: none;
            }
          }

          .button.no-label {
            border: 0.0625rem solid var(--accent);
            border-left: none;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;

            &::before {
              border-radius: inherit;
            }

            &.mobile-sort-by {
              border-left: 0.0625rem solid var(--accent);
              border-top-left-radius: var(--radius-m);
              border-bottom-left-radius: var(--radius-m);
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
              display: none;

              @media #{$mobile} {
                display: inline-flex;
              }
            }
          }
        }

        .action {
          margin-left: 1rem;
          flex-shrink: 1;

          &:only-child {
            margin-left: auto;
          }

          @media #{$mobile} {
            margin-bottom: 1rem;
            flex-grow: 1;

            &:only-child {
              margin-bottom: 0;
            }
          }
        }
      }
    }

    .folder-scroller {
      &:deep(.shadow) {
        bottom: 0.125rem;
      }
    }

    .folder-wrapper {
      display: flex;
      padding-bottom: 0.125rem;
      position: relative;

      .folder {
        border: none;
        background-color: var(--bg-secondary);
        border-radius: var(--radius-m);
        align-items: center;
        padding-left: 1rem;
        padding-top: 0.5rem;
        padding-right: 0.5rem;
        padding-bottom: 1rem;
        white-space: nowrap;
        cursor: pointer;
        min-width: rem(192);
        transition: background-color 200ms ease;

        &.v-enter-active,
        &.v-leave-active,
        &.v-move {
          transition: opacity 200ms ease, transform 350ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
            transform: scale(0.8);
          }
        }

        &:not(:last-child) {
          margin-right: 1rem;
        }

        &.no-actions {
          padding-top: calc(0.5rem + rem(9));
        }

        &:hover {
          background-color: var(--bg-tertiary);
        }

        header {
          display: flex;
          align-items: center;

          .icon:not(.button) {
            margin-right: 1rem;
            width: 2rem;
            height: 2rem;
            margin-right: auto;
            color: var(--accent);
          }
        }

        p {
          margin-bottom: 0;
          margin-right: 0.5rem;
          max-width: 100%;
          font-weight: 700;

          &:not(.meta)  {
            display: flex;
            align-items: center;

            span {
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }

          &.meta {
            font-weight: 400;
            margin-top: 0;
            margin-bottom: 0;
            font-size: 0.875rem;
            color: var(--text-secondary);
          }
        }
      }
    }

    > p.h3 {
      font-size: 1rem;

      & + .files {
        margin-top: 1.5rem;

        &.thumbnails {
          margin-top: 1rem;
        }
      }
    }

    .files {
      list-style: none;
      padding: 0;
      margin: 0;
      position: relative;

      li {
        background-color: var(--bg-secondary);
        padding: 0.5rem;
        padding-left: 1rem;
        border-radius: var(--radius-m);
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: background-color 200ms ease;

        &.v-enter-active,
        &.v-leave-active,
        &.v-move {
          transition: opacity 200ms ease, transform 350ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
          }
        }

        &.v-leave-active {
          position: absolute;
          width: 100%;
        }

        &:hover {
          background-color: var(--bg-tertiary);
        }

        &.no-actions {
          padding-top: calc(0.5rem + rem(13));
          padding-bottom: calc(0.5rem + rem(13));
          padding-right: calc(0.5rem + rem(13));
        }

        &:not(:last-child) {
          margin-bottom: 1rem;
        }

        &.active {
          background-color: var(--accent);
          color: var(--text-dark);

          &:hover,
          &:focus-visible {
            background-color: var(--accent-darkened-5);
          }

          span.meta {
            color: var(--text-secondary-dark);
          }

          .button {
            &:hover {
              background-color: var(--accent);
            }

            &:focus-visible {
              background-color: var(--accent-darkened-5);
            }
          }
        }

        .icon:not(.button) {
          margin-right: 1rem;
          flex-shrink: 0;
        }

        span {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;

          &:not(.meta) {
            margin-right: 0.5rem;
          }

          &.meta {
            margin-left: auto;
            font-size: 0.875rem;
            color: var(--text-secondary);
          }
        }

        .chip {
          margin-left: 0.5rem;
          margin-right: 0.5rem;
          margin-top: -0.125rem;
          margin-bottom: -0.125rem;
          flex-shrink: 0;
        }

        .button {
          margin-left: 1rem;
        }
      }

      &.thumbnails {
        margin: -0.5rem;
        display: flex;
        flex-wrap: wrap;

        li {
          overflow: hidden;
          margin: 0.5rem;
          display: block;
          padding: 0;
          width: calc(33.33% - 1rem);

          @media #{$tablet} {
            width: calc(50% - 1rem);
          }

          @media #{$mobile} {
            width: 100%;
          }

          &.active .thumbnail {
            box-shadow: inset 0 0 0 0.125rem var(--accent);
          }

          .thumbnail {
            color: var(--text-dark);
            height: 12rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background-image: linear-gradient(to right, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), linear-gradient(to right, black 50%, white 50%), linear-gradient(to 0.125rem, black 50%, white 50%);
            background-size: 1.5rem 1.5rem;
            background-blend-mode: normal, difference;
            position: relative;

            .icon,
            img {
              &.v-enter-active,
              &.v-leave-active {
                position: absolute;
                transition: opacity 200ms ease;

                &.v-enter-from,
                &.v-leave-to {
                  opacity: 0;
                }
              }
            }

            .icon {
              margin: 0;
              width: 3rem;
              height: 3rem;
            }

            img {
              max-width: 100%;
              max-height: 100%;

              &.hidden {
                opacity: 0;
              }
            }
          }

          footer {
            padding: 0.75rem;
            padding-right: 0.5rem;
            display: flex;
            align-items: center;
            overflow: hidden;

            .left {
              margin-right: auto;
              overflow: hidden;

              header {
                height: rem(28); // so chip fits fully
                margin-top: -0.125rem; // to even out the paddings
                margin-bottom: 0;
                display: flex;
                align-items: center;
              }

              .chip {
                margin: 0;
                margin-left: 0.5rem;
                flex-shrink: 0;
              }

              .meta {
                text-overflow: ellipsis;
                overflow: hidden;
                display: block;
              }
            }

            .button {
              flex-shrink: 0;
            }
          }
        }
      }
    }

    .empty-state {
      color: var(--text-secondary);
      text-align: center;
      margin-bottom: 0;
    }

    .folder-wrapper .folder,
    .files li {
      position: relative;

      &:focus,
      &:active {
        &::before {
          opacity: 1;
        }
      }

      &:active {
        transform: translateY(0.125rem);
        background-color: var(--bg);
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

      .local-changes-indicator {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background-color: var(--warning-saturated);
        display: inline-block;
        margin-right: 0.5rem;
        flex-shrink: 0;
      }
    }
  }
</style>
