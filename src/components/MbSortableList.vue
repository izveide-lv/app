<template>
  <transition-group class="sortable-list" :class="{ dragging }" tag="div">
    <div v-for="(item, index) in items" class="drag-item" :class="{ transitions: enableTransitions }" :data-area="areaId" :data-index="index" :key="item[keyName] || item" @click="handleClick(index, $event)" @pointerdown.left="startDrag($event, index)">
      <slot :active-item="activeItem" :index="index" :item="item" />
    </div>
  </transition-group>
</template>

<script>
import findClosestScrollParent from '../assets/js/findClosestScrollParent';

import autoscroll from '../mixins/autoscroll';

export default {
  beforeUnmount() {
    window.removeEventListener('pointerup', this.stopDrag);
    window.removeEventListener('pointermove', this.handlePointerMove, { passive: true });
  },
  data() {
    return {
      activeItem: null,
      areaId: Math.random().toString(36).slice(2, 9),
      beingDragged: false,
      cloneClickDelta: null,
      dragging: false,
      draggingClone: null,
      lastEl: null,
      scrollParent: {
        el: null,
        rect: null,
      },
      wasBottomHalf: null,
    };
  },
  emits: ['itemclick', 'itemmove'],
  methods: {
    handleClick(index, e) {
      if (!this.beingDragged && typeof e.target.dataset.ignoreDrag === 'undefined') this.$emit('itemclick', index);
    },
    handlePointerMove(e) {
      this.beingDragged = true; // we moved the cursor
      this.draggingClone.style.left = `${e.clientX - this.cloneClickDelta.x}px`;
      this.draggingClone.style.top = `${e.clientY - this.cloneClickDelta.y}px`;

      this.autoscroll(this.scrollParent.el, this.scrollParent.rect, e.clientX, e.clientY);

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !el.dataset.index || el.dataset.area !== this.areaId || el === this.dragging) return;
      const index = Number.parseInt(el.dataset.index, 10);

      const elRect = el.getBoundingClientRect();
      const isBottomHalf = this.direction === 'vertical' ? (e.clientY - elRect.top) > elRect.height / 2 : (e.clientX - elRect.left) > elRect.width / 2;

      if (el === this.lastEl && isBottomHalf === this.wasBottomHalf) return;

      this.$emit('itemmove', { activeItem: this.activeItem, index, isBottomHalf });
      this.wasBottomHalf = isBottomHalf;
      this.lastEl = el;
    },
    startDrag(e, index) {
      const closestDragHandle = e.target.closest('[data-drag-handle]');
      const closestIgnoreZone = e.target.closest('[data-ignore-drag]');
      if (!closestDragHandle || !this.$el.contains(closestDragHandle) || (closestIgnoreZone && this.$el.contains(closestIgnoreZone)) || e.target.closest('div.sortable-list') !== this.$el) return; // that last check is needed to prevent outer sortable lists from hijacking nested sortable lists, but might break if there’s a <div class="sortable-list" /> somewhere between e.target and $el
      if (this.draggingClone) this.destroyClone();
      this.dragging = e.currentTarget;
      this.activeItem = this.items[index];

      const rect = e.currentTarget.getBoundingClientRect();
      const clone = e.currentTarget.cloneNode(true);
      this.cloneClickDelta = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      clone.style.position = 'fixed';
      clone.style.left = `${e.clientX - this.cloneClickDelta.x}px`;
      clone.style.top = `${e.clientY - this.cloneClickDelta.y}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = 999;
      clone.style.margin = 0;
      document.body.append(clone);
      this.draggingClone = clone;

      const style = document.createElement('STYLE');
      style.innerText = '* { cursor: grabbing !important; }';
      style.id = `${this.areaId}-grabbingStyle`;
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
      this.beingDragged = false;
      this.lastEl = null;
      this.wasBottomHalf = null;
      this.activeItem = null;
    },
    stopDrag() {
      window.removeEventListener('pointerup', this.stopDrag);
      window.removeEventListener('pointermove', this.handlePointerMove, { passive: true });
      document.getElementById(`${this.areaId}-grabbingStyle`).remove();
      if (this.autoscrollAnimationFrame) window.cancelAnimationFrame(this.autoscrollAnimationFrame);
      const targetRect = this.dragging.getBoundingClientRect();
      const { left: currentLeft, top: currentTop } = this.draggingClone.style;
      if (Number.parseInt(currentLeft, 10) === Math.floor(targetRect.left) && Number.parseInt(currentTop, 10) === Math.floor(targetRect.top)) {
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
    direction: {
      type: String,
      default: 'vertical',
      validator: (v) => ['horizontal', 'vertical'].includes(v),
    },
    enableTransitions: Boolean,
    items: Array,
    keyName: String,
  },
};
</script>

<style lang="scss">
  .sortable-list {
    position: relative;

    &.dragging {
      > .drag-item > * {
        pointer-events: none;
      }
    }

    > .drag-item {
      &.transitions {
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
      }

      &.v-move {
        transition: transform 200ms cubic-bezier(0.19, 0.005, 0, 1.005);
        pointer-events: none;
      }

      [data-drag-handle] {
        touch-action: none;
      }
    }
  }
</style>
