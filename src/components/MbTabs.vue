<template>
  <MbScroller class="tabs" :class="{ dark }">
    <div class="scroll-wrapper">
      <transition-group ref="tabs" tag="ul" @enter="refresh = !refresh" @after-leave="resetActiveTab">
        <li v-for="(tab, index) in tabs" :data-index="index" data-tab :key="tab.value || tab" tabindex="0" @click.left="activateTab($event, index)" @keydown.space.prevent @keyup.enter.space="activateTab($event, index)">
          <transition>
            <span v-if="errors.has(index)" class="error-indicator" />
          </transition>
          {{tab.label || tab}}
        </li>
        <li v-if="showAddOption" class="add-option" key="mbTabsAddOption" tabindex="0" @click="addTab" @keydown.space.prevent @keyup.enter.space="addTab" @mouseenter="handleTooltip" @focus="handleTooltip"><MbIcon icon="plus" /></li>
      </transition-group>
      <div class="active-indicator" :style="{ transform: indicatorTransform }"></div>
    </div>
  </MbScroller>
</template>

<script>
export default {
  computed: {
    indicatorTransform() {
      if (!this.mounted || !this.$refs.tabs) return 'translateX(0) scaleX(0)';

      // mention so it triggers the function again
      this.refresh; // eslint-disable-line no-unused-expressions

      const tabElement = this.$refs.tabs.$el.children[this.modelValue];
      if (!tabElement) return 'translateX(0) scaleX(0)';

      const translate = tabElement.offsetLeft;
      const scale = tabElement.offsetWidth / 100; // 100 is the initial width of the active-indicator element in px
      return `translateX(${translate}px) scaleX(${scale})`;
    },
  },
  data() {
    return {
      mounted: false,
      oldLength: 0,
      refresh: false,
    };
  },
  emits: ['add-tab', 'update:modelValue'],
  methods: {
    activateTab(e, index) {
      this.$emit('update:modelValue', index);
      this.scrollTabIntoView(e.currentTarget);
    },
    addTab() {
      this.$emit('add-tab');
      this.$nextTick(() => this.scrollTabIntoView(this.$refs.tabs.$el.lastChild));
    },
    handleTooltip(e) {
      this.$store.commit('setTooltip', { message: 'Add new tab', target: e.currentTarget });
    },
    resetActiveTab(el) {
      this.refresh = !this.refresh;
      if (this.oldLength === this.tabs.length) return;
      const activeTabBackup = this.modelValue;
      if (el.dataset.index > activeTabBackup) this.$emit('update:modelValue', activeTabBackup);
      else this.$emit('update:modelValue', Math.max(0, activeTabBackup - 1));
    },
    scrollTabIntoView(el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    },
  },
  mounted() {
    // needed so the active indicator can update its position
    this.mounted = true;
  },
  props: {
    dark: Boolean,
    errors: {
      type: Set,
      default: () => new Set(),
    },
    showAddOption: Boolean,
    tabs: {
      type: Array,
      default: () => [],
    },
    modelValue: Number,
  },
  watch: {
    tabs(nv, ov) {
      this.oldLength = ov.length;
      this.$nextTick(() => { this.refresh = !this.refresh; });
    },
  },
};
</script>

<style lang="scss" scoped>
  .tabs {
    position: relative;
    color: var(--text);
    background-color: var(--bg);
    box-shadow: inset 0 -2px 0 0 var(--bg-secondary);
    white-space: nowrap;
    max-width: 100%;
    user-select: none;

    &.dark {
      color: var(--text-dark);
      background-color: var(--bg-dark);
      box-shadow: inset 0 -2px 0 0 var(--bg-secondary-dark);

      .scroll-wrapper > ul li {
        &:hover,
        &:focus {
          background-color: var(--bg-secondary-dark);
        }
      }
    }

    .scroll-wrapper {
      position: relative;

      > ul {
        margin: 0;
        width: 100%;
        list-style: none;
        padding: 0;

        li {
          display: inline-flex;
          vertical-align: top;
          align-items: center;
          padding: 1rem 1.5rem;
          cursor: pointer;
          border-top-left-radius: var(--radius-m);
          border-top-right-radius: var(--radius-m);
          position: relative;
          transition: background-color 200ms ease;

          &.add-option {
            line-height: 0;
            vertical-align: top;
          }

          &:hover,
          &:focus {
            background-color: var(--bg-secondary);
          }

          &:focus {
            outline: none;
          }

          &.v-enter-active,
          &.v-leave-active {
            transition: transform 200ms ease, opacity 200ms ease;

            &.v-enter-from,
            &.v-leave-to {
              transform: translateY(1rem);
              opacity: 0;
            }
          }

          .error-indicator {
            display: inline-block;
            width: 0.5rem;
            height: 0.5rem;
            background-color: var(--negative);
            border-radius: 50%;
            margin-right: 0.5rem;

            &.v-enter-active,
            &.v-leave-active {
              transition: transform 350ms ease;

              &.v-enter-from,
              &.v-leave-to {
                transform: scale(0);
              }
            }

            &.v-enter-active {
              transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            &.v-leave-active {
              transition-timing-function: cubic-bezier(0.6, -0.28, 0.735, 0.045);
            }
          }
        }
      }

      .active-indicator {
        position: absolute;
        width: 100px;
        height: 2px;
        background-color: var(--accent);
        bottom: 0;
        left: 0;
        transform-origin: left;
        transition: transform 200ms cubic-bezier(0.645, 0.045, 0.355, 1);
      }
    }

    &:deep(.shadow) {
      bottom: 2px;
    }
  }
</style>
