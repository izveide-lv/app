<template>
  <section class="image field">
    <div class="display-wrapper" :class="{ active, dark, error: cleanError, 'in-split': inSplit, 'no-display-value': !displayValue, warning: resolutionWarning }" tabindex="0" @click="openDetails" @keyup.enter.space="openDetails" @keydown.space.prevent @mouseenter="showPathTooltip">
      <div class="image-wrapper" :class="{ dark }">
        <transition mode="out-in">
          <img v-if="image" class="hidden" draggable="false" :src="image" alt="Image not found" @load="handlePreviewLoad">
          <MbIcon v-else icon="image" />
        </transition>
      </div>
      <div class="left">
        <p class="label" :class="{ unstyled: !displayValue }">{{cleanError || resolutionWarning || labelWithSizeHint}}</p>
        <p v-if="displayValue || cleanError" class="content">{{displayValue || labelWithSizeHint}}</p>
      </div>
      <MbIcon v-if="compact" :icon="active ? 'cross' : cleanError ? 'error' : resolutionWarning ? 'warning' : 'pencil'" />
    </div>
    <MbModal v-if="mediaSettings.advanced && !options.simple" class="image-data" :dark="dark" :title="labelWithSizeHint" :visible="showDetailsModal" @after-close="handleModalClosed" @close="closeDetails" @keyup.ctrl.enter="closeDetails">
      <teleport v-if="!teleportTarget || active" :disabled="!teleportTarget" :to="teleportTarget">
        <h2 v-if="teleportTarget" class="h3 split-title">{{labelWithSizeHint}}</h2>
        <div class="image-details">
          <div class="thumbnail" :class="{ dark, empty: !modelValue || !modelValue.src }">
            <img v-show="image" :src="image" :alt="modelValue && modelValue.alt || 'Error loading file'" @load="setImageResolutionAndColor">
            <div class="button-wrapper">
              <MbButton dark :icon="modelValue ? 'replace-round' : 'plus'" @click="showSelectModal = true">{{ modelValue ? 'Replace image' : 'Add image'}}</MbButton>
              <MbButton v-if="options.removable && modelValue" dark icon="trash" type="negative" @click="handleInput(null)">Remove image</MbButton>
            </div>
          </div>
          <dl v-show="modelValue && modelValue.src" class="meta" :class="{ dark, 'in-split': teleportTarget }">
            <dl @mouseenter="showNameTooltip">
              <dt>Name:</dt>
              <dd>{{fileDetails.name}}</dd>
            </dl>
            <dl v-show="fileDetails.width !== null && fileDetails.height !== null">
              <dt>Resolution:</dt>
              <dd>{{fileDetails.width}}x{{fileDetails.height}}</dd>
            </dl>
            <dl v-show="fileDetails.dominantColor !== null">
              <dt>Color:</dt>
              <dd>
                <span class="color-indicator" :style="{ backgroundColor: fileDetails.dominantColor }" />
                <span class="color-code">{{fileDetails.dominantColor}}</span>
              </dd>
            </dl>
            <dl>
              <dt>Type:</dt>
              <dd>{{fileDetails.type}}</dd>
            </dl>
          </dl>
          <MbFieldsEditor v-show="modelValue && modelValue.src" :dark="dark" compact :error="error instanceof Map ? error : new Map()" :fields="$store.state.currentProject.media.customFields" :in-split="Boolean(teleportTarget)" :model-value="typeof modelValue === 'string' ? {} : modelValue" :languages="languages" @update:error="handleMetaError" @update:model-value="updateMeta" />
        </div>
      </teleport>
      <template #actions>
        <MbButton :dark="dark" type="primary" @click="closeDetails">Done</MbButton>
      </template>
    </MbModal>
    <MediaSelectModal :dark="dark" :max-size="validation && validation.max ? validation.max : null" :no-meta="options && options.simple" :selected-file-path="selectedFilePath" :show-remove-button="options && options.removable" :visible="showSelectModal" @clear-image="clearImage" @close="showSelectModal = false" @file-selected="handleInput" @too-large-error="handleTooLargeError" @update-meta-is-new="metaIsNew = $event" />
  </section>
</template>

<script>
import { cloneDeep as _cloneDeep } from 'lodash-es';

import fs, { joinPath, pathBasename } from '../../fs';

import { loadImage } from '../../fs/workerFS';

import validateContent from '../../assets/js/validateContent';

import field from '../../mixins/field';
import setImageResolutionAndColor from '../../mixins/setImageResolutionAndColor';

import MediaSelectModal from '../utility/MediaSelectModal.vue';

const IMAGE_TOO_LARGE_ERROR = 'The selected image is too large';

export default {
  beforeUnmount() {
    if (this.image) URL.revokeObjectURL(this.image);
  },
  components: {
    MediaSelectModal,
  },
  computed: {
    cleanError() {
      if (!this.error) return '';
      if (this.error instanceof Map && this.error.get(this.fieldKey)) return this.error.get(this.fieldKey);
      return this.error.size === 1 ? 'A subfield has errors' : `${this.error.size} subfields have errors`;
    },
    idealResolution() {
      if (!this.options.resolutionHint) return null;
      // NOTE: Could be shortened with optional chaining, but in the interest of supporting older JS versions it’s not done
      const numberStrings = this.options.resolutionHint.match(/\d+/g);
      if (Array.isArray(numberStrings)) return numberStrings.map((value) => Number.parseInt(value, 10));
      return null;
    },
    labelWithSizeHint() {
      if (!this.options.resolutionHint) return this.label;
      return `${this.label} (${this.options.resolutionHint})`;
    },
    displayValue() {
      if (!this.modelValue) return null;
      return this.modelValue.src || this.modelValue;
    },
    mediaSettings() {
      return this.$store.state.currentProject.media;
    },
    normalisedSrc() {
      if (this.modelValue && typeof this.modelValue === 'object') {
        if (this.modelValue.src && this.outputPath && this.modelValue.src.startsWith(this.outputPath)) return this.modelValue.src.replace(this.outputPath, this.mediaSettings.dir);
        return this.modelValue.src;
      }
      if (this.outputPath && this.modelValue && this.modelValue.startsWith(this.outputPath)) return this.modelValue.replace(this.outputPath, this.mediaSettings.dir);
      return this.modelValue;
    },
    outputPath() {
      return this.mediaSettings.outputPath;
    },
    projectsDir() {
      return joinPath('/projects', this.$store.state.currentProject.id);
    },
    resolutionWarning() {
      if (!this.idealResolution || this.fileDetails.width === null || this.fileDetails.height === null) return null;
      const [width, height] = this.idealResolution;
      let widthError;
      let heightError;

      if (width) {
        if (this.fileDetails.width > width) widthError = `${this.label} is too wide`;
        else if (this.fileDetails.width < width) widthError = `${this.label} is not wide enough`;
      }

      if (height) {
        if (this.fileDetails.height > height) heightError = `${this.label} is too tall`;
        else if (this.fileDetails.height < height) heightError = `${this.label} is not tall enough`;
      }

      if (widthError && heightError) return `${this.label} doesn’t match the ideal resolution: ${width}x${height}px`;
      if (widthError) return `${widthError} (ideal width: ${width}px)`;
      if (heightError) return `${heightError} (ideal height: ${height}px)`;
      return null;
    },
    selectedFilePath() {
      if (!this.normalisedSrc) return null;
      return joinPath(this.projectsDir, this.normalisedSrc);
    },
    userPermissions() {
      if (!this.mediaSettings.permissions || !this.$store.getters.userInCurrentProject) return new Set();

      const { role } = this.$store.getters.userInCurrentProject;

      return new Set([
        ...(this.mediaSettings.permissions.everybody || []),
        ...(this.mediaSettings.permissions[role] || []),
      ]);
    },
  },
  data() {
    return {
      fileDetails: {
        dominantColor: null,
        height: null,
        name: null,
        type: null,
        width: null,
      },
      image: null,
      metaIsNew: false,
      showDetailsModal: false,
      showSelectModal: false,
    };
  },
  methods: {
    clearImage() {
      this.$emit('update:modelValue', null);
      if (this.image) {
        URL.revokeObjectURL(this.image);
        this.image = null;
      }
      this.showSelectModal = false;
    },
    closeDetails() {
      if (!this.mediaSettings.advanced || this.options.simple) {
        this.showSelectModal = false;
        return;
      }

      if (this.splitTarget) this.$emit('update:active', false);
      else this.showDetailsModal = false;
    },
    async fetchImage(path) {
      if (!path) return;
      const realPath = path.startsWith(this.projectsDir) ? path : joinPath(this.projectsDir, path);
      try {
        const { url, raw } = await loadImage(realPath);
        this.image = url;
        this.$el.dispatchEvent(new CustomEvent('image-load', { detail: { image: raw, path: this.modelValue.src || this.modelValue }, bubbles: true, composed: true })); // Using a CustomEvent here so we get bubbling and can listen to it in Edit Content
      } catch (err) {
        if (err.code === 'ENOENT') this.$store.commit('addToast', { message: `The image for “${this.label}” could not be found. It may have been moved, renamed, or deleted and should be updated accordingly`, timeout: 10000, type: 'warning' });
        else this.$store.commit('addToast', { message: `Something went wrong when fetching the image thumbnail for ${this.label}: ${err.message}`, type: 'error' });
      }
    },
    async handleInput(newVal) {
      if (newVal === null) this.$emit('update:error', ''); // clear the old error so advanced media library errors are removed
      const error = this.validate(newVal);
      const fieldError = this.error && this.error.get(this.fieldKey);

      if (error) {
        if ((fieldError && fieldError !== error) || (!fieldError && this.error)) this.$emit('update:error', _cloneDeep(this.error).set(this.fieldKey, error));
        else if (!fieldError && !this.error) this.$emit('update:error', new Map().set(this.fieldKey, error));
      } else if (fieldError && this.error) {
        const clone = _cloneDeep(this.error);
        clone.delete(this.fieldKey);
        this.$emit('update:error', clone.size > 0 ? clone : '');
      }

      let prefixedNewVal = newVal;
      if (newVal && this.outputPath) {
        if (typeof newVal === 'string') prefixedNewVal = newVal.replace(this.mediaSettings.dir, this.outputPath);
        else if (newVal.src) prefixedNewVal.src = newVal.src.replace(this.mediaSettings.dir, this.outputPath);
      }

      this.$emit('update:modelValue', prefixedNewVal);
    },
    handleMetaError(err) {
      if (!err || err.size === 0) this.$emit('update:error', '');
      else this.$emit('update:error', err);
    },
    async handleModalClosed() {
      this.validateContent();
      await this.$nextTick(); // wait a tick so this.error is up to date
      this.saveNewMeta();
    },
    handlePreviewLoad(e) {
      e.target.classList.remove('hidden');

      if (!this.mediaSettings.advanced || this.options.simple) {
        this.fileDetails.width = e.target.naturalWidth;
        this.fileDetails.height = e.target.naturalHeight;
      }
    },
    handleTooLargeError() {
      this.$emit('update:error', (this.error instanceof Map ? _cloneDeep(this.error) : new Map()).set(this.fieldKey, IMAGE_TOO_LARGE_ERROR));
    },
    openDetails() {
      if (this.active) {
        this.closeDetails();
        return;
      }

      if (!this.mediaSettings.advanced || this.options.simple) {
        this.showSelectModal = true;
        return;
      }

      this.fileDetails.name = this.modelValue && this.modelValue.src && pathBasename(this.modelValue && this.modelValue.src);
      if (this.fileDetails.name) this.fileDetails.type = this.fileDetails.name.slice(this.fileDetails.name.lastIndexOf('.') + 1).toUpperCase();

      if (this.splitTarget) this.$emit('update:active', true);
      else this.showDetailsModal = true;
    },
    async saveNewMeta() {
      if (!this.error && this.metaIsNew && (this.userPermissions.has('everything') || this.userPermissions.has('editMedia'))) {
        this.metaIsNew = false;
        const mediaMetaDir = joinPath(this.projectsDir, '.mattrbld', 'media');
        const pathInMediaDir = this.normalisedSrc.replace(this.mediaSettings.dir, '');
        const newMeta = _cloneDeep(this.modelValue);
        delete newMeta.src;
        await fs.writeFile(joinPath(mediaMetaDir, `${pathInMediaDir}.json`), JSON.stringify(newMeta, null, 2), 'utf8');
        this.$store.commit('addLocallyChangedFile', joinPath(mediaMetaDir, `${pathInMediaDir}.json`));
        this.$store.dispatch('saveAppData');
      }
    },
    showNameTooltip(e) {
      if (!this.fileDetails.name) return;

      const tooltip = {
        message: this.fileDetails.name,
        target: e.currentTarget,
      };
      this.$store.commit('setTooltip', tooltip);
    },
    showPathTooltip(e) {
      if (!this.modelValue) return;

      const tooltip = {
        message: this.displayValue,
        target: e.currentTarget,
      };
      this.$store.commit('setTooltip', tooltip);
    },
    updateMeta(newValue) {
      this.handleInput(newValue);
    },
    validateContent() {
      if (!this.normalisedSrc || typeof this.modelValue === 'string') return;
      const errors = validateContent(this.modelValue || {}, { fields: this.mediaSettings.customFields }, this.languages);
      if (this.error && this.error.get(this.fieldKey)) {
        if (errors.size === 0) return;
        this.$emit('update:error', new Map([...this.error, ...errors]));
      } else this.$emit('update:error', errors.size > 0 ? errors : '');
    },
  },
  mixins: [field, setImageResolutionAndColor],
  mounted() {
    if (this.normalisedSrc) this.fetchImage(this.normalisedSrc);
  },
  watch: {
    async active(nv) {
      if (!nv) {
        this.validateContent();
        await this.$nextTick(); // need to wait a tick so we have an up-to-date error
        this.saveNewMeta();
      }
    },
    modelValue(nv, ov) {
      if (!nv || nv === null) {
        if (this.image) URL.revokeObjectURL(this.image);
        this.fileDetails.dominantColor = null;
        this.fileDetails.height = null;
        this.fileDetails.name = null;
        this.fileDetails.type = null;
        this.fileDetails.width = null;
        this.image = null;
        if (this.error && this.error.get(this.fieldKey) === IMAGE_TOO_LARGE_ERROR) {
          const clone = _cloneDeep(this.error);
          clone.delete(this.fieldKey);
          this.$emit('update:error', clone.size > 0 ? clone : '');
        }
      } else if (typeof nv === 'string' && (!ov || nv !== ov || nv !== ov.src)) {
        if (this.image) URL.revokeObjectURL(this.image);
        this.fetchImage(this.normalisedSrc);
      } else if (typeof nv === 'object' && (!ov || !ov.src || nv.src !== ov.src)) {
        if (this.image) URL.revokeObjectURL(this.image);
        this.image = null;
        this.fileDetails.dominantColor = null;
        this.fileDetails.height = null;
        this.fileDetails.name = this.modelValue && this.modelValue.src && pathBasename(this.modelValue && this.modelValue.src);
        this.fileDetails.type = this.fileDetails.name && this.fileDetails.name.slice(this.fileDetails.name.lastIndexOf('.') + 1).toUpperCase();
        this.fileDetails.width = null;
        // window.setTimeout(() => this.fetchImage(this.normalisedSrc), 200); // this timeout is to avoid a brief bit of lag if the images are too big and ColorThief blocks for a bit
        this.fetchImage(this.normalisedSrc);
        if (this.error && this.error.get(this.fieldKey)) {
          const clone = _cloneDeep(this.error);
          clone.delete(this.fieldKey);
          this.$emit('update:error', clone.size > 0 ? clone : '');
        }
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;
  @use '../../assets/styles/fields';

  .image.field {
    .display-wrapper {
      .image-wrapper {
        flex-shrink: 0;
        width: 3rem;
        height: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 1rem;
        color: var(--text-dark);
        overflow: hidden;
        border-radius: var(--radius-s);
        background-image: linear-gradient(to right, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), linear-gradient(to right, black 50%, white 50%), linear-gradient(to bottom, black 50%, white 50%);
        background-size: 1.5rem 1.5rem;
        background-blend-mode: normal, difference;

        &.dark {
          background-image: linear-gradient(to right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)), linear-gradient(to right, black 50%, white 50%), linear-gradient(to bottom, black 50%, white 50%);
        }

        .icon {
          margin-left: 0;
        }

        img {
          display: block;
          max-width: 100%;
          max-height: 100%;
          object-fit: cover;
          transition: opacity 200ms ease;

          &.hidden {
            opacity: 0;
          }
        }

        .icon,
        img {
          &.v-enter-active,
          &.v-leave-active {
            transition: opacity 200ms ease;

            &.v-enter-from,
            &.v-leave-to {
              opacity: 0;
            }
          }
        }
      }
    }
  }

  .image-details {
    .thumbnail {
      height: 16rem;
      color: var(--text-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      background-image: linear-gradient(to right, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), linear-gradient(to right, black 50%, white 50%), linear-gradient(to bottom, black 50%, white 50%);
      background-size: 1.5rem 1.5rem;
      background-blend-mode: normal, difference;
      position: relative;
      border-top-left-radius: var(--radius-l);
      border-top-right-radius: var(--radius-l);
      overflow: hidden;

      @media #{$mobile} {
        height: 12rem;
      }

      &.dark {
        background-image: linear-gradient(to right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)), linear-gradient(to right, black 50%, white 50%), linear-gradient(to bottom, black 50%, white 50%);
      }

      &.empty {
        border-bottom-left-radius: var(--radius-l);
        border-bottom-right-radius: var(--radius-l);
      }

      img {
        max-width: 100%;
        max-height: 100%;
      }

      .button-wrapper {
        position: absolute;
        align-self: flex-end;
        background-color: color-mix(in srgb, var(--bg-dark) 80%, transparent);
        width: 100%;
        text-align: center;

        .button {
          margin: 0.5rem;
        }
      }
    }

    .meta {
      background-color: var(--bg-secondary);
      margin: 0;
      padding: 1rem;
      display: flex;
      justify-content: center;
      border-bottom-left-radius: var(--radius-l);
      border-bottom-right-radius: var(--radius-l);

      &.dark {
        background-color: var(--bg-secondary-dark);

        &.in-split {
          background-color: var(--bg-tertiary-dark);
        }

        dl {
          dt {
            color: var(--text-secondary-dark);
          }

          dd .color-indicator {
            box-shadow: inset 0 0 0 0.0625rem var(--text-tertiary-dark);
          }
        }
      }

      dl {
        margin: 0;
        overflow: hidden;
        flex-shrink: 0;

        &:first-child {
          flex-shrink: 1;
        }

        &:not(:last-child) {
          margin-right: 4rem;
        }

        dt,
        dd {
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        dt {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        dd {
          .color-indicator {
            vertical-align: middle;
            margin-right: 0.5rem;
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border-radius: 50%;
            box-shadow: inset 0 0 0 0.0625rem var(--text-tertiary);
          }

          .color-code {
            vertical-align: middle;
            user-select: all;
          }
        }
      }

      @media #{$mobile} {
        display: block;
        padding: 1rem;
        border-bottom-left-radius: var(--radius-m);
        border-bottom-right-radius: var(--radius-m);

        dl:not(:last-child) {
          margin-right: 0;
          margin-bottom: 0.5rem;
        }
      }
    }

    .fields-editor {
      margin-top: 2rem;
    }
  }
</style>
