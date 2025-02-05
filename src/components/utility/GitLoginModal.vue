<template>
  <MbModal class="git-login-modal" :dark="dark" slim title="Log into your Git account" :visible="visible" @after-open="$refs.username.focus()" @close="handleCancel">
    <p v-if="message" v-html="message" />
    <p v-else>To confirm that you may perform this action, please sign into your Git account.</p>
    <form @submit.prevent>
      <MbInput v-model="user" autofocus :dark="dark" icon="user" label="Username or Email Address" name="username" ref="username" />
      <MbInput v-model="password" :dark="dark" icon="key" label="Password or Access Token" name="password" type="password" />
    </form>
    <MbCheckbox v-model="savePassword" :dark="dark">Remember until the end of the session</MbCheckbox>
    <MbHighlightBox color="warning" :dark="dark">
      <p>
        If you have set up two-factor authentication (2FA) on your account or are
        importing from Github, you will have to generate an App Password or Personal
        Access Token to use in place of your password. You may also want to do this in
        order to increase security for your account while using Mattrbld.
        <a href="https://mattrbld.com/docs/authentication/" target="_blank" rel="noreferrer noopener">Learn more about authentication.</a>
      </p>
    </MbHighlightBox>
    <template #actions>
      <MbButton :dark="dark" @click="handleCancel">Cancel</MbButton>
      <MbButton :dark="dark" :disabled="!user || !password" type="primary" @click="handleSubmit">Submit</MbButton>
    </template>
  </MbModal>
</template>

<script>
export default {
  data() {
    return {
      user: '',
      password: '',
      savePassword: false,
    };
  },
  emits: ['cancel', 'submit'],
  methods: {
    handleCancel() {
      this.$emit('cancel');
      this.password = '';
    },
    handleSubmit() {
      this.$emit('submit', { user: this.user, password: this.password, savePassword: this.savePassword });
      this.password = '';
    },
  },
  props: {
    dark: Boolean,
    message: String,
    visible: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  .git-login-modal {

    form {
      margin-top: 1.5rem;

      .input {
        width: 100%;

        &:first-child {
          margin-top: 0;
        }
      }
    }

    .checkbox {
      margin-top: 1.5rem;
    }

    .highlight-box {
      margin-top: 2.5rem;
      margin-bottom: 0;
    }
  }
</style>
