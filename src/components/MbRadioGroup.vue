<template>
  <div class="radio-group" :class="{ dark, inline }">
    <label v-for="(option, index) in options" :class="{ active: index === activeOptionIndex }" :key="index" tabindex="0" @keydown.space.prevent @keyup.space.enter="$emit('update:modelValue', typeof option.value !== 'undefined' ? option.value : option )">
      <input :checked="index === activeOptionIndex" type="radio" :name="groupId" tabindex="-1" :value="typeof option.value !== 'undefined' ? option.value : option" @change="$emit('update:modelValue', $event.target.value)">
      <span class="label-text">{{typeof option.label !== 'undefined' ? option.label : option}}</span>
      <span class="fake-radio">
        <MbIcon v-if="!inline" icon="check" />
      </span>
    </label>
  </div>
</template>

<script>
export default {
  computed: {
    activeOptionIndex() {
      return this.options.findIndex((option) => {
        if (typeof option.value !== 'undefined') return this.modelValue === option.value;
        return this.modelValue === option;
      });
    },
  },
  data() {
    return {
      groupId: Math.random().toString(36).substring(2, 9),
    };
  },
  props: {
    dark: Boolean,
    inline: Boolean,
    modelValue: {},
    options: Array,
  },
};
</script>

<style lang="scss" scoped>
  .radio-group {
    display: flex;
    flex-direction: column;
    user-select: none;

    &.inline {
      flex-direction: row;
      flex-wrap: wrap;
      margin: -0.5rem;

      label {
        margin: 0.5rem;
        padding: 1rem 1.5rem;
        flex-direction: row-reverse;

        &:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        &.active .fake-radio::after {
          transform: scale(0.5);
        }

        .label-text {
          margin-right: 0;
          margin-left: 0.5rem;
        }

        .fake-radio {
          width: 1rem;
          height: 1rem;
        }
      }
    }

    &.dark {
      label {
        &:hover,
        &:focus {
          background-color: var(--bg-tertiary-dark);
        }

        &:active {
          background-color: var(--bg-secondary-dark);
        }

        .fake-radio::after {
          background-color: var(--bg-dark);
        }
      }
    }

    label {
      padding: 1.5rem;
      box-shadow: inset 0 0 0 1px var(--accent);
      border-radius: var(--radius-m);
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: background-color 200ms ease, box-shadow 200ms ease;

      &:not(:last-child) {
        margin-bottom: 1rem;
      }

      &:hover,
      &:focus {
        background-color: var(--bg-tertiary);
      }

      &:focus {
        box-shadow: inset 0 0 0 2px var(--accent);
      }

      &:active {
        transform: translateY(2px);
        background-color: var(--bg-secondary);
      }

      &.active {
        .fake-radio {
          color: var(--text-dark);

          &::after {
            transform: scale(0);
          }

          .icon {
            stroke-dashoffset: 0;
          }
        }
      }

      input {
        display: none;
      }

      .label-text {
        margin-right: 1rem;
        width: 100%;
      }

      .fake-radio {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background-color: var(--accent);
        margin-left: auto;
        position: relative;
        flex-shrink: 0;

        &::after {
          content: '';
          position: absolute;
          width: calc(100% - 0.25rem);
          height: calc(100% - 0.25rem);
          background-color: var(--bg);
          border-radius: 50%;
          top: 0.125rem;
          left: 0.125rem;
          transition: transform 200ms ease;
        }

        .icon {
          position: absolute;
          top: 0.25rem;
          left: 0.25rem;
          z-index: 1;
          width: 1rem;
          height: 1rem;
          stroke-dasharray: 19.79899024963379;
          stroke-dashoffset: 19.79899024963379;
          transition: stroke-dashoffset 100ms ease;
          transition-delay: 100ms;
          stroke-width: 3;
        }
      }
    }
  }
</style>
