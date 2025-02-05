<template>
  <AsyncImage :alt="projectId" class="project-avatar" :placeholder-color="projectColor" :src="projectAvatar" @load="handleLoad" />
</template>

<script>
import tinycolor from 'tinycolor2';
import SeededRNG from '../assets/js/SeededRNG';

import AsyncImage from './utility/AsyncImage.vue';

export default {
  components: {
    AsyncImage,
  },
  computed: {
    projectAvatar() {
      if (this.avatar) return this.avatar;
      return this.generatedAvatar;
    },
  },
  created() {
    this.rng = new SeededRNG(this.projectId);
    this.projectColor = tinycolor({ h: this.rng.random(0, 360), s: this.rng.random(0.6, 1), l: this.rng.random(0.2, 0.7) }).toHexString();

    if (!this.avatar) this.generateAvatar();
  },
  data() {
    return {
      generatedAvatar: null,
      projectColor: null,
      rng: null,
    };
  },
  methods: {
    generateAvatar() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 320; // could be scaled by remBase for ultimate crispness
      const height = 180; // could be scaled by remBase for ultimate crispness
      const color = this.projectColor;
      const color2 = tinycolor(color).spin(48).toHexString();
      const bg = ctx.createLinearGradient(0, height, width, 0);
      bg.addColorStop(0, color);
      bg.addColorStop(1, color2);
      let fg;
      const circle1 = {
        angle: this.rng.random() * Math.PI * 2,
        radius: this.rng.random(56, height),
        x: this.rng.random(-16, width + 16),
        y: this.rng.random(0, 16),
      };
      const circle2 = {
        angle: this.rng.random() * Math.PI * 2,
        radius: this.rng.random(56, height),
        x: this.rng.random(-16, width + 16),
        y: this.rng.random(height - 16, height),
      };

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.rect(0, 0, width, height);
      ctx.fillStyle = bg;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      fg = ctx.createLinearGradient(-circle1.radius, 0, circle1.radius, 0);
      fg.addColorStop(0, 'rgba(255,255,255,0.25)');
      fg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fg;
      ctx.translate(circle1.x, circle1.y);
      // ctx.rotate(circle1.angle);
      ctx.ellipse(0, 0, circle1.radius, circle1.radius, circle1.angle, 0, 360);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      fg = ctx.createLinearGradient(-circle2.radius, 0, circle2.radius, 0);
      fg.addColorStop(0, 'rgba(255,255,255,0.25)');
      fg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fg;
      ctx.translate(circle2.x, circle2.y);
      // ctx.rotate(circle2.angle);
      ctx.ellipse(0, 0, circle2.radius, circle2.radius, circle2.angle, 0, 360);
      ctx.fill();
      ctx.restore();

      if (this.projectName) {
        ctx.font = '700 24px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = tinycolor(color).isLight() ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.75)';
        ctx.fillText(this.projectName, width / 2, height / 2 + 4);
      }

      this.generatedAvatar = canvas.toDataURL('image/jpeg', 0.92);
    },
    handleLoad() {
      if (this.avatar) URL.revokeObjectURL(this.avatar); // we get passed an ObjectURL and don’t need it anymore after we displayed the image
    },
  },
  props: {
    avatar: String,
    projectId: {
      type: String,
      required: true,
    },
    projectName: String,
  },
  watch: {
    avatar(nv) {
      if (!nv && !this.generatedAvatar) this.generateAvatar();
    },
    projectName(nv, ov) {
      if (nv !== ov && !this.avatar) {
        // We have to reinitialise the rng and simulate regenerating the project color so we always get the same image
        this.rng = new SeededRNG(this.projectId);
        this.rng.random();
        this.rng.random();
        this.rng.random();
        this.generateAvatar();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  .project-avatar {
    width: 100%;
    max-width: rem(320);

    &::before {
      content: '';
      display: block;
      padding-top: calc((180 / 320) * 100%);
    }
  }
</style>
