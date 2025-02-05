<template>
  <div class="not-found">
    <div class="wrapper">
      <MbIcon icon="warning" />
      <h1>{{type}} Not Found</h1>
      <p v-if="type === 'collection'">
        The collection you were looking for doesn’t exist. Was it perhaps renamed or deleted? 🤔
      </p>
      <p v-else-if="type === 'document'">
        The document you were looking for doesn’t exist. Was it perhaps renamed or deleted? 🤔
      </p>
      <p v-else-if="type === 'content item'">
        The content item you were looking for doesn’t exist. Was it perhaps renamed or deleted? 🤔
      </p>
      <p v-else>
        The page you were looking for does not exist. Perhaps you’d like to build it? 😉
      </p>
      <footer>
        <MbButton :dark="dark" @click="$router.replace('/')">Go Home</MbButton>
        <MbButton :dark="dark" type="primary" @click="$router.back()">Go Back</MbButton>
      </footer>
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    type() {
      if (!this.$route.query || !this.$route.query.type) return 'page';
      return this.$route.query.type;
    },
  },
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .not-found {
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
      color: var(--warning-saturated);
      margin-top: 16rem;

      @media #{$mobile} {
        margin-top: 8rem;
      }
    }

    h1 {
      margin-top: 2rem;
      text-transform: capitalize;
    }

    footer {
      margin-top: 2rem;

      .button:first-child {
        margin-right: 1rem;
      }
    }
  }
</style>
