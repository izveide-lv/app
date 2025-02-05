<template>
  <div class="project-documentation">
    <article v-html="content" />
    <pre v-if="frontmatter && Object.keys(frontmatter).length > 0" :class="{ dark }">{{frontmatter}}</pre>
  </div>
</template>

<script>
import matter from 'gray-matter';

import fs, { joinPath } from '../fs';
import MarkdownParser from '../assets/js/MarkdownParser';

const md = new MarkdownParser();
let imageUrls; // needs to be defined out here so we can free those urls when we leave again

async function readAndParseFile(path, id) {
  try {
    const file = matter(await fs.readFile(joinPath('/projects', id, path), 'utf8')); // load the file and pipe it through gray-matter

    // We search for all local image URLs starting with a / and replace them with the image loaded from the browser filesystem
    const imageFinder = /!\[.*?\]\((\/.+?)\)/g;
    const allImageUrls = Array.from(file.content.matchAll(imageFinder), (match) => match[1]); // we just need the content of the first capturing group
    const imageData = await Promise.allSettled(allImageUrls.map((url) => fs.readFile(joinPath('/projects', id, url)))); // Images might not exist, we will just ignore those

    imageUrls = imageData.map((data) => {
      if (data.status !== 'rejected') return URL.createObjectURL(new Blob([data.value]));
      return '';
    });

    let matchNo = 0; // we need to keep track of which image belongs to which original url
    const contentWithReplacedImages = file.content.replace(imageFinder, (match, firstGroup) => {
      const url = imageUrls[matchNo];
      matchNo += 1;
      return match.replace(firstGroup, url);
    });

    const renderedMd = md.parse(contentWithReplacedImages);
    const unparsedFrontmatter = file.data;
    return { content: renderedMd, error: null, frontmatter: unparsedFrontmatter };
  } catch (err) {
    if (err.code === 'ENOENT') return { content: null, error: { name: 'NotFound', query: { type: 'document' }, replace: true }, frontmatter: null };
    return { content: null, error: err, frontmatter: null };
  }
}

export default {
  async beforeRouteEnter(to, from, next) {
    if (to.params.path) {
      const { content, error, frontmatter } = await readAndParseFile(to.params.path, to.params.id);

      if (!error) {
        next((vm) => {
          vm.frontmatter = frontmatter; // eslint-disable-line no-param-reassign
          vm.content = content; // eslint-disable-line no-param-reassign
        });
        return;
      }
      next(error);
      return;
    }
    next({ name: 'NotFound', query: { type: 'document' }, replace: true });
  },
  beforeRouteLeave() {
    if (imageUrls && imageUrls.length > 0) imageUrls.forEach((url) => url && URL.revokeObjectURL(url));
  },
  async beforeRouteUpdate(to) {
    if (to.params.path) {
      const { content, error, frontmatter } = await readAndParseFile(to.params.path, to.params.id);
      if (error) return error;
      this.frontmatter = frontmatter;
      this.content = content;
      return true;
    }
    return { name: 'NotFound', query: { type: 'document' }, replace: true };
  },
  data() {
    return {
      content: null,
      frontmatter: null,
    };
  },
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  .project-documentation {
    padding: 0 1rem;
    height: 100%;
    overflow: auto;

    > pre {
      max-width: 60rem;
      margin-left: auto;
      margin-right: auto;
      margin-bottom: 4rem;
      background-color: transparent;
      color: var(--text-secondary);
      border: 0.0625rem dashed var(--text-tertiary);

      &.dark {
        color: var(--text-secondary-dark);
        border-color: var(--text-tertiary-dark);
      }
    }

    > article {
      padding: 4rem 0;
      padding-bottom: 0;
      max-width: 40rem;
      margin: 0 auto;

      > :first-child {
        margin-top: 0;
      }

      &:deep(img) {
        display: block;
        max-width: 100%;
        margin: 2rem auto;
      }
    }
  }
</style>
