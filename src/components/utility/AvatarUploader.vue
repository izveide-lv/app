<template>
  <input accept="image/png, image/jpeg" class="avatar-uploader" type="file" @change="loadImage">
</template>

<script>
export default {
  emits: ['ready'],
  methods: {
    loadImage(e) {
      const img = e.target.files[0];
      const imageURL = window.URL.createObjectURL(img);
      const image = new Image();

      this.$el.value = ''; // clear the input, we don’t need it anymore

      image.onload = () => {
        window.URL.revokeObjectURL(imageURL);
        const canvas = document.createElement('canvas');
        const width = this.width || this.size;
        const height = this.height || this.size;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';

        const { theme } = this.$store.state.user;
        if (theme === 'light' || (theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)) ctx.fillStyle = '#f4f3ff';
        else if (theme === 'dark' || (theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) ctx.fillStyle = '#2B2A32';
        ctx.fillRect(0, 0, width, height);

        const sourceAspectRatio = image.width / image.height;
        const targetAspectRatio = width / height;

        if (sourceAspectRatio < targetAspectRatio) {
          // we’re cropping top and bottom
          const sourceWidth = image.width;
          const sourceHeight = image.width / targetAspectRatio;
          const cropDistance = (image.height - sourceHeight) / 2;
          ctx.drawImage(image, 0, cropDistance, sourceWidth, sourceHeight, 0, 0, width, height);
        } else {
          // we’re cropping the sides
          const sourceWidth = image.height * targetAspectRatio;
          const sourceHeight = image.height;
          const cropDistance = (image.width - sourceWidth) / 2;
          ctx.drawImage(image, cropDistance, 0, sourceWidth, sourceHeight, 0, 0, width, height);
        }

        const avatar = canvas.toDataURL('image/jpeg', Math.max(Math.min(this.compression, 1), 0));
        this.$emit('ready', avatar);
      };
      image.src = imageURL;
    },
  },
  props: {
    compression: {
      type: Number,
      default: 0.45,
    },
    height: Number,
    size: {
      type: Number,
      default: 128,
    },
    width: Number,
  },
};
</script>

<style lang="scss" scoped>
  .avatar-uploader {
    display: none;
  }
</style>
