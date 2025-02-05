<template>
  <div class="field-arrangement-item" :class="{ 'drag-active': dragActive, dragging: beingDragged, 'hide-outline': hideOutline }">
    <div class="info" :class="{ active, dark }" tabindex="0" @keydown.space.prevent @keyup.space.enter="$emit('fieldclick')" @click.left="handleClick" @contextmenu.prevent="handleContextMenu" @pointerdown.left="startDrag">
      <MbIcon class="drag-handle" icon="drag-handle" ref="dragHandle" />
      <div class="field-icon">
        <MbIcon :icon="icon" />
      </div>
      <span class="label"><strong>{{label}}</strong></span>
      <span v-if="errors" class="chip error">Error</span>
      <span v-if="outdated" class="chip warning">Outdated</span>
      <span v-if="localised" class="chip">Localised</span>
      <span v-if="required" class="chip">Required</span>
      <span v-if="!visualOnly" class="key">{{fieldKey}}</span>
      <MbIcon v-if="hidden" class="hidden" :class="{ 'push-right': visualOnly }" icon="hide" />
      <MbIcon class="action" :class="{ 'push-right': visualOnly && !hidden }" :icon="active ? 'cross' : 'pencil'" />
    </div>
    <FieldArrangementList v-if="nestedFields" :dark="dark" :field-being-edited="fieldBeingEdited" :fields="nestedFields" :field-versions="fieldVersions" :parent-key="parentKey !== '___toplevel'  ? `${parentKey}.${fieldKey}` : fieldKey" />
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';

import findClosestScrollParent from '../../assets/js/findClosestScrollParent';

import autoscroll from '../../mixins/autoscroll';

export default {
  name: 'FieldArrangementItem',
  components: {
    FieldArrangementList: defineAsyncComponent(() => import('./FieldArrangementList.vue')),
  },
  computed: {
    dragActive() {
      return this.$store.state.application.dragActive;
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
    outdated() {
      return !this.version || this.version < this.fieldVersions.get(this.customField || this.type);
    },
  },
  data() {
    return {
      beingDragged: false,
      cloneClickDelta: null,
      dragging: false,
      draggingClone: null,
      hideOutline: false,
      lastEl: null,
      scrollParent: {
        el: null,
        rect: null,
      },
      wasBottomHalf: null,
    };
  },
  emits: ['fieldclick', 'fieldcontextmenu', 'fieldmove'],
  methods: {
    handleClick() {
      if (!this.beingDragged) this.$emit('fieldclick');
    },
    handleContextMenu(e) {
      if (!this.beingDragged) {
        if (this.dragging) this.stopDrag();
        this.$emit('fieldcontextmenu', e);
      }
    },
    handlePointerMove(e) {
      this.beingDragged = true; // we moved the cursor
      if (!this.dragActive) this.$store.commit('setAppProperty', { key: 'dragActive', value: true });
      this.draggingClone.style.left = `${e.clientX - this.cloneClickDelta.x}px`;
      this.draggingClone.style.top = `${e.clientY - this.cloneClickDelta.y}px`;

      this.autoscroll(this.scrollParent.el, this.scrollParent.rect, e.clientX, e.clientY);

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !el.dataset.index || (!el.dataset.parent && typeof el.dataset.tab === 'undefined') || el === this.dragging) return;
      const index = Number.parseInt(el.dataset.index, 10);
      let { parent } = el.dataset;
      if (!parent) parent = '___mb_tab';

      if (parent !== this.parentKey) this.hideOutline = true;
      else this.hideOutline = false;

      if (el.classList.contains('empty-state')) { // if it’s empty we don’t need to check the position
        if (el === this.lastEl) return;
        this.$emit('fieldmove', { parent, index, dropzone: true });
        this.lastEl = el;
        return;
      }

      const elRect = el.getBoundingClientRect();
      const isBottomHalf = (e.clientY - elRect.top) > elRect.height / 2;

      if (el === this.lastEl && isBottomHalf === this.wasBottomHalf) return;

      if (isBottomHalf) this.$emit('fieldmove', { parent, index, isBottomHalf });
      else this.$emit('fieldmove', { parent, index });
      this.wasBottomHalf = isBottomHalf;
      this.lastEl = el;
    },
    startDrag(e) {
      if (this.isMobile && e.target !== this.$refs.dragHandle.$el && !this.$refs.dragHandle.$el.contains(e.target)) return; // only allow dragging on drag handle on mobile
      if (this.draggingClone) this.destroyClone();

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

      this.scrollParent.el = findClosestScrollParent(this.$el);
      const parentRect = this.scrollParent.el.getBoundingClientRect();
      this.scrollParent.rect = {
        top: Math.max(parentRect.top, 0),
        left: Math.max(parentRect.left, 0),
        width: Math.min(parentRect.width, window.innerWidth),
        height: Math.min(parentRect.height, window.innerHeight),
      };

      window.addEventListener('pointerup', this.stopDrag);
      window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    },
    destroyClone() {
      this.draggingClone.remove();
      this.draggingClone = null;
      this.dragging = false;
      this.cloneClickDelta = null;
      this.hideOutline = false;
      this.beingDragged = false;
      this.lastEl = null;
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
      if (this.hideOutline || (Number.parseInt(currentLeft, 10) === Math.floor(targetRect.left) && Number.parseInt(currentTop, 10) === Math.floor(targetRect.top))) {
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
    active: Boolean,
    customField: String,
    dark: Boolean,
    errors: Map,
    fieldBeingEdited: Object,
    fieldKey: String,
    fieldVersions: Map,
    hidden: Boolean,
    icon: {
      type: String,
      default: 'mattrbld',
    },
    label: {
      type: String,
      default: 'Unlabled field',
    },
    localised: Boolean,
    nestedFields: Array,
    parentKey: String,
    required: Boolean,
    type: {
      type: String,
      default: 'Unknown',
    },
    version: Number,
    visualOnly: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .field-arrangement-item {
    &.drag-active {
      > .info {
        pointer-events: none;
      }
    }

    &.dragging {
      border-radius: var(--radius-l);
      box-shadow: inset 0 0 0 0.125rem var(--accent);
      pointer-events: none;

      > .info,
      > .field-arrangement-list {
        opacity: 0;
      }

      > .field-arrangement-list {
        transform: translateY(-2rem);
      }
    }

    &.hide-outline {
      height: 0;
      overflow: hidden;
    }

    .field-arrangement-list {
      padding-top: 1rem;  // so it still counts as field space
      margin-right: 0.125rem;
      margin-left: 2rem;
      transition: opacity 100ms ease, transform 100ms ease;
    }
  }

  // needs to be outdented so the styles work on the clone
  .info {
    display: flex;
    align-items: center;
    padding: 1rem;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-l);
    cursor: pointer;
    transition: background-color 200ms ease;
    touch-action: none;

    @media #{$mobile} {
      touch-action: auto;
    }

    &:focus-visible {
      box-shadow: inset 0 0 0 0.125rem var(--accent);
    }

    &:hover {
      background-color: var(--bg);
    }

    &.dark {
      background-color: var(--bg-secondary-dark);

      &:hover:not(.active) {
        background-color: var(--bg-tertiary-dark);
      }

      span {
        &.chip {
          background-color: var(--bg-dark);
        }

        &.key {
          color: var(--text-secondary-dark);
        }
      }

      .hidden {
        color: var(--text-tertiary-dark);
      }
    }

    &.active {
      background-color: var(--accent);
      color: var(--text-dark);

      &:focus-visible,
      &:hover {
        background-color: var(--accent-darkened-5);
      }

      .field-icon {
        box-shadow: inset 0 0 0 0.0625rem var(--text-dark);
      }

      span {
        &.chip {
          background-color: var(--accent-secondary);
          color: var(--text);
        }

        &.key {
          color: var(--text-secondary-dark);
        }
      }

      .hidden {
        color: var(--text-tertiary-dark);
      }
    }

    .drag-handle {
      margin-right: 1rem;
      cursor: move;
      flex-shrink: 0;
      touch-action: none;
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

    span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.label {
        margin-right: 1rem;

        @media #{$tablet} {
          margin-right: auto;
        }
      }

      &.chip {
        padding: rem(4) rem(12);
        background-color: var(--bg);
        margin-right: 0.5rem;
        border-radius: 1rem;

        @media #{$tablet} {
          display: none;
        }

        &.error,
        &.warning {
          background-color: var(--negative);
          color: var(--text);

          @media #{$tablet} {
            display: inline;
            flex-shrink: 0;
          }

          @media #{$mobile} {
            display: inline-block;
            width: 1rem;
            height: 1rem;
            padding: 0;
            color: transparent; // hide the text
            flex-shrink: 0;
          }
        }

        &.warning {
          background-color: var(--warning-saturated);
        }
      }

      &.key {
        margin-left: auto;
        margin-right: 0.5rem;
        color: var(--text-secondary);

        @media #{$tablet} {
          display: none;
        }
      }
    }

    .hidden {
      flex-shrink: 0;
      color: var(--text-tertiary);
      margin: 0 0.5rem;
    }

    .action {
      margin: 0 0.5rem;
      flex-shrink: 0;

      @media #{$mobile} {
        display: none;
      }
    }

    .hidden,
    .action {
      &.push-right {
        margin-left: auto;
      }
    }
  }
</style>
