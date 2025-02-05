<template>
  <div class="field-thumbnail">
    <div class="field" :class="{ dark, dragging }" @click="isMobile ? $emit('add-field') : null" @pointerdown.left="startDrag">
      <MbIcon icon="drag-handle" />
      <div class="field-icon">
        <MbIcon :icon="icon" />
      </div>
      <div class="field-info">
        <p>{{name}}</p>
        <p>{{description}}</p>
      </div>
    </div>
    <MbButton :dark="dark" icon="plus" rounded :tooltip="{ message: 'Add this field to the end of the schema', position: 'right' }" type="positive" @click="$emit('add-field')" />
  </div>
</template>

<script>
import findClosestScrollParent from '../../assets/js/findClosestScrollParent';

import autoscroll from '../../mixins/autoscroll';

export default {
  beforeUnmount() {
    window.removeEventListener('pointerup', this.stopDrag);
    window.removeEventListener('pointermove', this.handlePointerMove, { passive: true });
  },
  computed: {
    isMobile() {
      return this.$store.state.application.mobile;
    },
  },
  data() {
    return {
      activeDropzone: null,
      cloneClickDelta: null,
      dragging: false,
      draggingClone: null,
      lastHoveredEl: null,
      scrollParent: {
        el: null,
        rect: null,
      },
      wasBottomHalf: null,
    };
  },
  emits: ['add-field', 'field-over'],
  methods: {
    handlePointerMove(e) {
      this.draggingClone.style.left = `${e.clientX - this.cloneClickDelta.x}px`;
      this.draggingClone.style.top = `${e.clientY - this.cloneClickDelta.y}px`;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      if (!this.lastHoveredEl || (this.lastHoveredEl !== el && !this.lastHoveredEl.contains(el))) {
        this.scrollParent.el = findClosestScrollParent(el);
        const parentRect = this.scrollParent.el.getBoundingClientRect();
        this.scrollParent.rect = {
          top: Math.max(parentRect.top, 0),
          left: Math.max(parentRect.left, 0),
          width: Math.min(parentRect.width, window.innerWidth),
          height: Math.min(parentRect.height, window.innerHeight),
        };
        this.lastHoveredEl = el;
      }
      if (this.scrollParent.el) this.autoscroll(this.scrollParent.el, this.scrollParent.rect, e.clientX, e.clientY);

      if (typeof el.dataset.addIndicator !== 'undefined') return; // fix jitter when over an add indicator
      if (!el || !el.dataset.index || !el.dataset.parent || el === this.dragging) { // we have left a valid dropzone
        if (this.activeDropzone) {
          this.$emit('field-over', { parent: null, index: null });
          this.activeDropzone = null;
          this.wasBottomHalf = null;
        }
        return;
      }
      const index = Number.parseInt(el.dataset.index, 10);
      const { parent } = el.dataset;

      if (el.classList.contains('empty-state')) { // if it’s empty we don’t need to check the position
        if (this.activeDropzone === el) return; // no need to re-emit, we’re already on it
        this.$emit('field-over', { parent, index, dropzone: true });
        this.activeDropzone = el;
        return;
      }

      const elRect = el.getBoundingClientRect();
      const isBottomHalf = (e.clientY - elRect.top) > elRect.height / 2;

      if (el === this.activeDropzone && isBottomHalf === this.wasBottomHalf) return; // nothing has changed, we don’t need to emit again

      this.$emit('field-over', { parent, index, isBottomHalf });
      this.activeDropzone = el;
      this.wasBottomHalf = isBottomHalf;
    },
    startDrag(e) {
      if (this.isMobile) return; // no drag-n-drop when modal is open
      if (this.draggingClone) this.destroyClone();
      this.$store.commit('setAppProperty', { key: 'dragActive', value: true });
      this.dragging = e.currentTarget;

      const rect = e.currentTarget.getBoundingClientRect();
      const clone = e.currentTarget.cloneNode(true);
      this.cloneClickDelta = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      clone.style.position = 'fixed';
      clone.style.left = `${e.clientX - this.cloneClickDelta.x}px`;
      clone.style.top = `${e.clientY - this.cloneClickDelta.y}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = 999;
      clone.style.margin = 0;
      document.body.append(clone);
      this.draggingClone = clone;

      const style = document.createElement('STYLE');
      style.innerText = '* { cursor: grabbing !important; }';
      style.id = 'fieldThumbnailGrabbingStyle';
      document.querySelector('head').append(style);

      window.addEventListener('pointerup', this.stopDrag);
      window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    },
    destroyClone() {
      this.draggingClone.remove();
      this.draggingClone = null;
      this.dragging = false;
      this.cloneClickDelta = null;
      this.activeDropzone = null;
      this.wasBottomHalf = null;
    },
    stopDrag() {
      window.removeEventListener('pointerup', this.stopDrag);
      window.removeEventListener('pointermove', this.handlePointerMove, { passive: true });
      document.getElementById('fieldThumbnailGrabbingStyle').remove();
      this.$store.commit('setAppProperty', { key: 'dragActive', value: false });
      if (this.autoscrollAnimationFrame) window.cancelAnimationFrame(this.autoscrollAnimationFrame);
      const targetRect = this.dragging.getBoundingClientRect();
      const { left: currentLeft, top: currentTop } = this.draggingClone.style;
      if (this.activeDropzone || (Number.parseInt(currentLeft, 10) === Math.floor(targetRect.left) && Number.parseInt(currentTop, 10) === Math.floor(targetRect.top))) {
        if (this.activeDropzone) this.$emit('add-field');
        this.destroyClone();
        return;
      }
      this.draggingClone.style.transition = 'left 200ms ease, top 200ms ease';
      this.draggingClone.style.left = `${targetRect.left}px`;
      this.draggingClone.style.top = `${targetRect.top}px`;
      this.draggingClone.addEventListener('transitionend', this.destroyClone, { once: true });
    },
  },
  mixins: [autoscroll],
  props: {
    dark: Boolean,
    description: String,
    icon: String,
    name: String,
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .field-thumbnail {
    display: flex;
    align-items: center;

    &:not(:last-child) {
      margin-bottom: 0.5rem;
    }

    .button {
      margin-left: 1rem;
      flex-shrink: 0;

      @media #{$mobile} {
        display: none;
      }
    }
  }

  // needs to be toplevel so the drag-clone has the styling
  .field {
    display: flex;
    align-items: center;
    width: 100%;
    border-radius: var(--radius-m);
    padding: 1rem;
    box-shadow: inset 0 0 0 0.0625rem var(--text-tertiary);
    overflow: hidden;
    background-color: var(--bg);
    touch-action: none;

    @media #{$mobile} {
      touch-action: auto;
    }

    &.dragging {
      opacity: 0.25;
    }

    &.dark {
      box-shadow: inset 0 0 0 0.0625rem var(--bg-tertiary-dark-lightened-10);
      background-color: var(--bg-tertiary-dark);

      .field-info p:last-child {
        color: var(--text-secondary-dark);
      }
    }

    > .icon:not(.button) {
      margin-right: 1rem;
      flex-shrink: 0;
      cursor: move;

      @media #{$mobile} {
        display: none;
      }
    }

    .field-icon {
      padding: 0.5rem;
      background-color: var(--accent);
      color: var(--text-dark);
      border-radius: var(--radius-m);
      margin-right: 1rem;

      .icon {
        display: block;
      }
    }

    .field-info {
      overflow: hidden;

      p {
        margin: 0;
        text-overflow: ellipsis;
        overflow: hidden;

        &:last-child {
          color: var(--text-secondary);
          font-size: 0.875rem;

          @media #{$tablet} {
            display: none;
          }
        }
      }
    }
  }
</style>
