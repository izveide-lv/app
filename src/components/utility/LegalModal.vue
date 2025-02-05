<template>
  <MbModal class="legal-modal" :dark="dark" :title="title" :visible="visible" @close="$emit('close')">
    <slot>
      <p>Izveide ir pielāgota Mattrbld instance, ko uztur SIA <a href="https://labojam.lv">"Sociālais kods"</a></p>
      <p><strong>Mattrbld projekts nav tiešā saistīts ar šo instanci.</strong></p>
    </slot>
    <template #actions>
      <MbButton :dark="dark" type="primary" @click="$emit('close')">Sapratu</MbButton>
    </template>
  </MbModal>
</template>

<script>
export default {
  emits: ['close'],
  props: {
    dark: Boolean,
    title: String,
    visible: Boolean,
  },
};
</script>

<style lang="scss" scoped>
</style>
