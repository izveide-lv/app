<template>
  <section class="checkboxes field">
    <p :class="{ error, warning }">{{ error || warning || `${label}:` }}</p>
    <MbCheckboxGroup :checkboxes="checkboxes" :dark="dark" :inline="options.type === 'inline'" :model-value="modelValue || []" @update:model-value="handleInput" />
  </section>
</template>

<script>
import fs, { joinPath } from '../../fs';
import field from '../../mixins/field';

export default {
  computed: {
    checkboxes() {
      if (Array.isArray(this.options.checkboxes)) return this.options.checkboxes.map((checkbox) => ({ label: checkbox.label || checkbox.value || checkbox, value: checkbox.value || checkbox }));
      // it’s a file
      return this.fileModel;
    },
    warning() {
      if (!this.modelValue || !this.validation || this.validation.enforceMinMax) return null;
      if (this.validation.min && this.modelValue.length < this.validation.min) {
        if (this.validation.min === 1) return 'You should select at least one box';
        return `You should select at least ${this.validation.min} boxes`;
      }

      if (this.validation.max && this.modelValue.length > this.validation.max) {
        if (this.validation.max === 1) return 'You shouldn’t select more than one box';
        return `You shouldn’t select more than ${this.validation.max} boxes`;
      }

      return null;
    },
  },
  created() {
    if (this.options.checkboxes && !Array.isArray(this.options.checkboxes)) this.fetchFileModel();
  },
  data() {
    return {
      fileModel: [],
    };
  },
  methods: {
    async fetchFileModel() {
      if (!this.options.checkboxes.path || !this.options.checkboxes.key) this.fileModel = [];
      else {
        try {
          const model = JSON.parse(await fs.readFile(joinPath('/projects', this.$store.state.currentProject.id, this.options.checkboxes.path), 'utf8'))[this.options.checkboxes.key];
          this.fileModel = model.map((checkbox) => ({ label: checkbox.label || checkbox.value || checkbox, value: checkbox.value || checkbox }));
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while loading the model for ${this.label}: ${err}`, type: 'error' });
        }
      }
    },
  },
  mixins: [field],
  watch: {
    'options.checkboxes': {
      handler(nv, ov) {
        if (!Array.isArray(nv) && nv.path && nv.key && (this.fileModel.length === 0 || ov.path !== nv.path)) this.fetchFileModel();
      },
    },
  },
};
</script>

<style lang="scss" scoped>
  .checkboxes.field {
    > p {
      margin-top: 0;
      margin-bottom: 0.5rem;

      &.error {
        color: var(--negative-saturated);
      }

      &.warning {
        color: var(--warning-saturated);
      }
    }
  }
</style>
