<template>
  <div class="toast" :class="[toast.type, { dark, 'no-footer': toast.permanent && !toast.action }]" :key="toast.id">
    <p>{{toast.message}}</p>
    <footer>
      <MbButton v-if="toast.action" :dark="dark" rounded :type="toast.type" @click="handleAction">{{toast.actionLabel || 'Action'}}</MbButton>
      <MbButton v-if="!toast.permanent" :dark="dark" icon="cross" rounded @click="close" />
    </footer>
  </div>
</template>

<script>
export default {
  data() {
    return {
      actionHandled: false,
      timeoutId: null,
    };
  },
  methods: {
    close() {
      if (this.timeoutId) window.clearTimeout(this.timeoutId);
      if (typeof this.toast.onClose === 'function') this.toast.onClose(this.actionHandled);
      this.$store.commit('removeToast', this.toast.id);
    },
    handleAction() {
      this.toast.action();
      this.actionHandled = true;
      this.close();
    },
  },
  mounted() {
    if (this.toast.timeout > 0) this.timeoutId = window.setTimeout(() => this.close(), this.toast.timeout);
    if (this.toast.closeOnRouteChange) {
      this.$watch(
        '$route',
        (to, from) => {
          if (to.name !== from.name) this.close();
        },
      );
    }
  },
  props: {
    dark: Boolean,
    toast: Object,
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .toast {
    margin: 1rem auto;
    padding: 1rem;
    border-radius: var(--radius-l);
    background-color: var(--bg);
    box-shadow: 0 1.3px 2.2px -12px color-mix(in srgb, var(--bg-dark) 1.7%, transparent),
                0 3.2px 5.3px -12px color-mix(in srgb, var(--bg-dark) 2.4%, transparent),
                0 6px 10px -12px color-mix(in srgb, var(--bg-dark) 3%, transparent),
                0 10.7px 17.9px -12px color-mix(in srgb, var(--bg-dark) 3.6%, transparent),
                0 20.1px 33.4px -12px color-mix(in srgb, var(--bg-dark) 4.3%, transparent),
                0 48px 80px -12px color-mix(in srgb, var(--bg-dark) 6%, transparent),
                inset 0 0 0 0.0625rem var(--accent-secondary);
    display: flex;
    align-items: center;
    max-width: 40rem;
    width: calc(100% - 2rem);
    pointer-events: auto; // to counter none from the parent

    @media #{$mobile} {
      flex-wrap: wrap;
      margin-top: 0;

      &:first-child {
        margin-top: auto;
      }

      &.no-footer {
        &::before {
          margin-bottom: 0;
        }

        p {
          margin-bottom: 0;
        }
      }
    }

    &.dark {
      background-color: var(--bg-secondary-dark);
      box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--accent-secondary) 25%, var(--bg-tertiary-dark));
    }

    &::before {
      display: block;
      content: '';
      width: 0.25rem;
      align-self: stretch;
      border-radius: 0.125rem;
      background-color: var(--accent);
      margin-right: 1rem;
      flex-shrink: 0;

      @media #{$mobile} {
        margin-bottom: 1rem;
      }
    }

    &.negative {
      box-shadow: 0 1.3px 2.2px -12px color-mix(in srgb, var(--bg-dark) 1.7%, transparent),
                  0 3.2px 5.3px -12px color-mix(in srgb, var(--bg-dark) 2.4%, transparent),
                  0 6px 10px -12px color-mix(in srgb, var(--bg-dark) 3%, transparent),
                  0 10.7px 17.9px -12px color-mix(in srgb, var(--bg-dark) 3.6%, transparent),
                  0 20.1px 33.4px -12px color-mix(in srgb, var(--bg-dark) 4.3%, transparent),
                  0 48px 80px -12px color-mix(in srgb, var(--bg-dark) 6%, transparent),
                  inset 0 0 0 0.0625rem var(--negative-saturated);

      &.dark {
        box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--negative-saturated) 25%, var(--bg-tertiary-dark));
      }

      &::before {
        background-color: var(--negative-saturated);
      }
    }

    &.positive {
      box-shadow: 0 1.3px 2.2px -12px color-mix(in srgb, var(--bg-dark) 1.7%, transparent),
        0 3.2px 5.3px -12px color-mix(in srgb, var(--bg-dark) 2.4%, transparent),
        0 6px 10px -12px color-mix(in srgb, var(--bg-dark) 3%, transparent),
        0 10.7px 17.9px -12px color-mix(in srgb, var(--bg-dark) 3.6%, transparent),
        0 20.1px 33.4px -12px color-mix(in srgb, var(--bg-dark) 4.3%, transparent),
        0 48px 80px -12px color-mix(in srgb, var(--bg-dark) 6%, transparent),
        inset 0 0 0 0.0625rem var(--positive-saturated);

      &.dark {
        box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--positive-saturated) 25%, var(--bg-tertiary-dark));
      }

      &::before {
        background-color: var(--positive-saturated);
      }
    }

    &.warning {
      box-shadow: 0 1.3px 2.2px -12px color-mix(in srgb, var(--bg-dark) 1.7%, transparent),
                  0 3.2px 5.3px -12px color-mix(in srgb, var(--bg-dark) 2.4%, transparent),
                  0 6px 10px -12px color-mix(in srgb, var(--bg-dark) 3%, transparent),
                  0 10.7px 17.9px -12px color-mix(in srgb, var(--bg-dark) 3.6%, transparent),
                  0 20.1px 33.4px -12px color-mix(in srgb, var(--bg-dark) 4.3%, transparent),
                  0 48px 80px -12px color-mix(in srgb, var(--bg-dark) 6%, transparent),
                  inset 0 0 0 0.0625rem var(--warning-saturated);

      &.dark {
        box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--warning-saturated) 25%, var(--bg-tertiary-dark));
      }

      &::before {
        background-color: var(--warning-saturated);
      }
    }

    p {
      margin: 0;
      margin-right: 2rem;

      @media #{$mobile} {
        margin-right: 0;
        margin-bottom: 1rem;
        max-width: calc(100% - 1.25rem);
      }
    }

    footer {
      margin-left: auto;
      text-align: right;
      white-space: nowrap;

      .button:last-child {
        margin-left: 1rem;
      }
    }
  }
</style>
