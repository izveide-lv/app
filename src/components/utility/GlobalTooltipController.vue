<template>
  <MbTooltip class="global-tooltip" :message="cachedTooltip.message" :position="cachedTooltip.position" :target="cachedTooltip.target" :visible="cachedTooltip && showTooltip" />
</template>

<script>
export default {
  computed: {
    tooltip() {
      return {
        position: 'bottom',
        timeout: 500,
        ...this.$store.state.application.tooltip,
      };
    },
  },
  data() {
    return {
      cachedTooltip: {},
      lastTarget: null,
      showTooltip: false,
      tooltipTimeout: null,
    };
  },
  methods: {
    clearTooltipTimeout() {
      if (this.tooltipTimeout) {
        window.clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = null;
      }
    },
    hide() {
      this.clearTooltipTimeout();
      window.removeEventListener('click', this.hide);

      if (this.lastTarget) {
        this.lastTarget.removeEventListener('mouseleave', this.hide);
        this.lastTarget.removeEventListener('blur', this.hide);
        this.lastTarget = null;
      }

      window.setTimeout(() => { // if there’s already a new tooltip in the pipeline, don’t hide and show again
        if (this.lastTarget) this.cachedTooltip = { ...this.tooltip }; // we need this to prevent flashing at the new position
        if (!this.lastTarget) this.showTooltip = false;
      }, 0);
    },
    show() {
      this.cachedTooltip = { ...this.tooltip }; // we need this to prevent flashing at the new position
      this.showTooltip = true;
    },
  },
  watch: {
    tooltip(nv) {
      if (nv.target) {
        this.clearTooltipTimeout();
        this.lastTarget = nv.target;
        window.addEventListener('click', this.hide);
        this.lastTarget.addEventListener('mouseleave', this.hide);
        this.lastTarget.addEventListener('blur', this.hide);

        if (nv.timeout > 0) this.tooltipTimeout = window.setTimeout(this.show, nv.timeout);
        else this.show();
      } else {
        this.hide();
      }
    },
  },
};
</script>

<style lang="scss">
  .global-tooltip {
    transition: transform 200ms ease;
    z-index: 1;
  }
</style>
