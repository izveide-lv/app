<template>
  <MbModal class="entity-move-modal" :dark="dark" :padded-body="false" slim :visible="visible" @after-close="resetPath" @close="$emit('close')">
    <h2 class="h3">{{title}}</h2>
    <MbFileList v-if="root" :dark="dark" :filterable="false" :folders-first="false" folders-only :pretty-filenames="prettyFilenames" ref="fileList" :root="root" :sortable="false" @path-change="currentPath = $event" />
    <template #actions>
      <MbButton :dark="dark" @click="handleCancel">Cancel</MbButton>
      <MbButton :dark="dark" :disabled="isInCurrentPath || isSamePath" type="primary" @click="moveEntity">Move here</MbButton>
    </template>
  </MbModal>
</template>

<script>
import fs, { pathBasename, pathDirname, joinPath } from '../../fs';

export default {
  computed: {
    isInCurrentPath() {
      if (!this.oldPath) return true; // if we have no old path, we shouldn’t be able to move
      return this.currentPath === pathDirname(this.oldPath);
    },
    isSamePath() {
      if (!this.currentPath) return false;
      return this.oldPath === this.currentPath || pathDirname(this.currentPath).startsWith(this.oldPath); // don’t allow moving into itself or one of its descendants
    },
  },
  data() {
    return {
      currentPath: this.root,
    };
  },
  emits: ['close', 'entity-moved'],
  methods: {
    resetPath() {
      if (this.currentPath !== this.root) this.$refs.fileList.currentPath = this.root;
      else this.$refs.fileList.refresh();
    },
    async moveEntity() {
      if (this.isInCurrentPath || this.isSamePath) return;

      const { oldPath, currentPath } = this;
      const newPath = joinPath(currentPath, pathBasename(oldPath));

      try {
        const children = await fs.readdir(currentPath);
        if (children.includes(pathBasename(oldPath))) {
          this.$store.commit('addToast', { message: 'Could not move the entity: this folder already contains an entity with this name', type: 'warning' });
          return;
        }
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while moving the entity: ${err.message}`, type: 'error' });
        return;
      }

      try {
        await fs.rename(oldPath, newPath);
        this.$emit('close');
        this.$emit('entity-moved', { oldPath, newPath });
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while moving the entity: ${err.message}`, type: 'error' });
      }
    },
    handleCancel() {
      this.$emit('close');
    },
  },
  props: {
    dark: Boolean,
    oldPath: String,
    prettyFilenames: Boolean,
    root: {
      type: String,
      default: '/',
    },
    title: {
      type: String,
      default: 'Move to…',
    },
    visible: Boolean,
  },
  watch: {
    isSamePath(nv) {
      if (nv) this.$store.commit('addToast', { message: 'You’re trying to move a folder into itself or one of it’s sub-directories!', type: 'warning' });
    },
    visible(nv) {
      if (nv && this.$refs.fileList) this.$refs.fileList.refresh();
    },
  },
};
</script>

<style lang="scss" scoped>
  .entity-move-modal {
    .h3 {
      margin: 0 2rem;
      margin-top: 2rem;
      margin-bottom: rem(19);
      text-align: center;
    }

    .file-list {
      margin-bottom: 0.125rem;
      margin-left: 2rem;
      margin-right: 2rem;

      &:deep(.empty-state) {
        margin: 2rem 0;
      }
    }
  }
</style>
