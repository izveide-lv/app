<script setup>
const svgModules = import.meta.glob('@/assets/icons/*.svg', { eager: true });
const symbols = Object.entries(svgModules).map(([filePath, module]) => {
  const content = module.default || module;
  const id = filePath.replace(/^\/src\/assets\/(.*)\.\w+$/, '$1');
  return content.replace('<svg', `<symbol id="${id}"`).replace('svg>', 'symbol>');
});
const svgSprite = symbols.join('\n');
</script>

<template>
  <svg width="0" height="0" style="display:none;">
    <defs v-html="svgSprite" />
  </svg>
</template>
