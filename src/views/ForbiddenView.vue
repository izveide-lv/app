<template>
  <div class="forbidden">
    <div class="wrapper">
      <MbIcon icon="key" />
      <h1>Access Denied</h1>
      <p>
        Sorry, but this user account does not have access to this resource. Please switch to another user and try again.
      </p>
      <footer>
        <MbButton :dark="dark" type="primary" @click="$router.replace('/')">Go Home</MbButton>
      </footer>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .forbidden {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: 40rem;
    width: calc(100% - 2rem);
    margin: 0 auto;

    .icon {
      width: 4rem;
      height: 4rem;
      color: var(--negative-saturated);
      margin-top: 16rem;

      @media #{$mobile} {
        margin-top: 8rem;
      }
    }

    h1 {
      margin-top: 2rem;
    }

    footer {
      margin-top: 2rem;

      .button:first-child {
        margin-right: 1rem;
      }
    }
  }
</style>
