<template>
  <transition-group class="permissions-list" :class="{ dark }" tag="ul">
    <li v-for="(rule, index) in rulesWithoutSoftDeleted" :key="rule.id">
      <MbSelect :dark="dark" :model-value="rule.role" :options="roles" placeholder="Select a role…" @update:model-value="handleRuleUpdate($event, index, 'role')" />
      <span>can</span>
      <MbSelect :dark="dark" :model-value="rule.permission" :options="permissions" placeholder="Select a permission…" @update:model-value="handleRuleUpdate($event, index, 'permission')" />
      <MbButton :dark="dark" icon="trash" tooltip="Delete rule" type="negative" @click="deleteRule(rule)">{{isMobile ? 'Delete rule' : null}}</MbButton>
    </li>
    <li key="addRule">
      <MbSelect v-model="newRule.role" :dark="dark" :options="roles" placeholder="Select a role…" />
      <span>can</span>
      <MbSelect v-model="newRule.permission" :dark="dark" :options="permissions" placeholder="Select a permission…" />
      <MbButton :dark="dark" :disabled="!newRule.role || !newRule.permission" icon="plus" tooltip="Add rule" type="positive" @click="addRule">{{isMobile ? 'Add rule' : null}}</MbButton>
    </li>
  </transition-group>
</template>

<script>
let idCounter = -1;
function uid() {
  idCounter += 1;
  return idCounter;
}

export default {
  computed: {
    isMobile() {
      return this.$store.state.application.mobile;
    },
    rulesWithoutSoftDeleted() {
      return this.rules.filter((rule) => !this.softDeleted.has(rule));
    },
  },
  created() {
    this.updateRules(this.modelValue);
  },
  data() {
    return {
      internalChange: false,
      newRule: {
        role: null,
        permission: null,
      },
      rules: [],
      softDeleted: new Set(),
    };
  },
  emits: ['update:modelValue'],
  methods: {
    addRule() {
      if (!this.modelValue[this.newRule.role] || !this.modelValue[this.newRule.role].includes(this.newRule.permission)) this.rules.push({ id: uid(), role: this.newRule.role, permission: this.newRule.permission });
      this.newRule = {
        role: null,
        permission: null,
      };
      this.updateModelValue();
    },
    deleteRule(rule) {
      this.softDeleted.add(rule);
      this.$store.commit('addToast', {
        action: () => {
          this.softDeleted.delete(rule);
        },
        actionLabel: 'Undo',
        message: 'The rule was deleted',
        onClose: (undone) => {
          if (undone) return;

          this.rules = this.rules.filter((existingRule) => existingRule !== rule);
          this.updateModelValue();
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    handleRuleUpdate(newVal, index, type) {
      this.rules[index][type] = newVal;
      this.updateModelValue();
    },
    updateModelValue() {
      this.internalChange = true;
      this.$emit('update:modelValue', this.rules.reduce((acc, { role, permission }) => {
        if (!acc[role]) acc[role] = [];
        acc[role].push(permission);
        return acc;
      }, {}));
    },
    updateRules(newValue) {
      this.rules = Object.entries(newValue).reduce((acc, [role, permissions]) => {
        acc.push(...permissions.map((permission) => ({ id: uid(), role, permission })));
        return acc;
      }, []);
    },
  },
  props: {
    dark: Boolean,
    roles: Array,
    permissions: Array,
    modelValue: Object,
  },
  watch: {
    modelValue(nv) {
      if (this.internalChange) {
        this.internalChange = false;
        return;
      }

      this.updateRules(nv);
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .permissions-list {
    list-style: none;
    margin: 0;
    position: relative;

    li {
      display: flex;
      align-items: center;

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

      &.v-move {
        transition: transform 200ms ease;
      }

      &:not(:last-child) {
        margin-bottom: 1rem;
      }

      > :deep(.select) {
        margin-right: 1rem;
        width: 100%;
      }

      > span {
        flex-shrink: 0;
        margin-right: 1rem;
      }

      > .button {
        flex-shrink: 0;
      }

      @media #{$mobile} {
        flex-wrap: wrap;
        justify-content: center;

        > .button {
          width: 100%;
          border-top-left-radius: 0;
          border-top-right-radius: 0;
          border-top: none;
        }

        > span {
          display: block;
          border-left: 0.0625rem solid var(--accent);
          border-right: 0.0625rem solid var(--accent);
          padding: 0.5rem 0;
          margin: 0;
          width: 100%;
          text-align: center;

          & + :deep(.select) {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
          }
        }

        > :deep(.select) {
          margin-right: 0;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
      }
    }
  }
</style>
