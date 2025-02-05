<template>
  <section class="radio-group field" :class="{ inline: options.type === 'inline' }">
    <p :class="{ error }">{{ error || `${label}:` }}</p>
    <MbRadioGroup v-if="options.type !== 'segmented'" :class="{ 'in-split': inSplit }" :dark="dark" :inline="options.type === 'inline'" :model-value="modelValue" :options="selectOptions" @update:model-value="handleInput" />
    <MbSegmentedSelector v-else :class="{ 'in-split': inSplit }" :dark="dark" :model-value="modelValue" :options="selectOptions" @update:model-value="handleInput" />
  </section>
</template>

<script>
import fs, { joinPath } from '../../fs';

import field from '../../mixins/field';

export default {
  computed: {
    selectOptions() {
      if (Array.isArray(this.options.options)) return this.options.options;
      // it’s a file
      return this.fileModel;
    },
  },
  created() {
    if (this.options.options && !Array.isArray(this.options.options)) this.fetchFileModel();
  },
  data() {
    return {
      fileModel: [],
    };
  },
  methods: {
    async fetchFileModel() {
      if (!this.options.options.path || !this.options.options.key) this.fileModel = [];
      else {
        try {
          this.fileModel = JSON.parse(await fs.readFile(joinPath('/projects', this.$store.state.currentProject.id, this.options.options.path), 'utf8'))[this.options.options.key];
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while loading the model for ${this.label}: ${err}`, type: 'error' });
        }
      }
    },
  },
  mixins: [field],
  watch: {
    'options.options': {
      handler(nv, ov) {
        if (!Array.isArray(nv) && nv.path && nv.key && (this.fileModel.length === 0 || ov.path !== nv.path)) this.fetchFileModel();
      },
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .radio-group.field {
    &.inline {
      display: flex;
      align-items: center;
      justify-content: space-between;

      > p {
        margin-right: 1rem;
      }
    }

    > p {
      margin: 0;
      margin-bottom: 0.5rem;

      &.error {
        color: var(--negative-saturated);
      }
    }

    > .radio-group.dark.in-split {
      &:deep(label .fake-radio::after) {
        background-color: var(--bg-secondary-dark);
      }
    }

    > .segmented-selector {
      &.dark.in-split {
        background-color: var(--bg-tertiary-dark);
        box-shadow: 0 0 0 0.125rem var(--bg-tertiary-dark);
      }
    }

    @media #{$mobile} {
      display: block;

      > p {
        margin-bottom: 0.5rem;
      }
    }
  }
</style>
