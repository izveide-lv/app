<template>
  <MbPopover class="preview-comment-thread" :dark="dark" no-content-padding no-footer-padding :prevent-close-on-outside-click="commentActions.show" update-on-resize use-capture-on-outside-click :visible="visible" :x="x" :y="y" @close="handleClose">
    <template v-if="comments && comments[0].status" #header>
      <div class="thread-status" :class="[comments[0].status]">
        <template v-if="comments[0].status === 'resolved'">
          <MbIcon icon="check" />
          <MbChip color="positive" :label="comments[0].status" />
        </template>
        <template v-if="comments[0].status === 'important'">
          <MbIcon icon="warning" />
          <MbChip color="warning" :label="comments[0].status" />
        </template>
        <template v-if="comments[0].status === 'critical'">
          <MbIcon icon="error" />
          <MbChip color="negative" :label="comments[0].status" />
        </template>
      </div>
    </template>
    <MbScroller class="comments" direction="vertical">
      <ul class="scroll-wrapper">
        <li v-for="(comment, index) in comments" class="comment" :class="{ owned: comment.author === this.currentUser.name }" :key="comment.id" @contextmenu.prevent="openMenu($event, comment, index)">
          <header>
            <span class="author"><strong>{{comment.author}}</strong></span>
            <span class="timestamp">{{ formatTimestamp(comment.created) }}</span>
            <MbButton v-if="canComment && comment.author === this.currentUser.name" :dark="dark" icon="more-vertical" @click="openMenu($event, comment, index)" />
          </header>
          <div class="content" v-html="comment.content" />
        </li>
      </ul>
    </MbScroller>
    <template #footer>
      <MbEditor v-if="canComment" v-model="reply.content" :dark="dark" :format-options="{}" :formats="{ block: ['blockquote', 'orderedList', 'unorderedList'], inline: ['code', 'em', 'strike', 'strong'] }"  output-format="html" placeholder="Your reply…" ref="commentEditor" @keyup.ctrl.enter="addReply" />
      <div class="button-wrapper">
        <MbButton :dark="dark" @click="$emit('close')">Close</MbButton>
        <MbButton v-if="canComment" :dark="dark" :disabled="!reply || !reply.content || reply.content === '<p></p>'" :loading="reply.loading" icon="comment-reply-alt" type="positive" @click="addReply">Send Reply</MbButton>
      </div>
    </template>
    <MbContextMenu class="options" :dark="dark" :from-right="commentActions.fromRight" :options="modifiedCommentActions" :show="commentActions.show" :target="commentActions.target" :x="commentActions.x" :y="commentActions.y" @close="handleContextMenuClose" />
  </MbPopover>
</template>

<script>
import formatTimestamp from '../../assets/js/formatTimestamp';

export default {
  computed: {
    currentUser() {
      return this.$store.getters.userInCurrentProject;
    },
    modifiedCommentActions() {
      const actions = [];

      if (!this.canComment || (this.currentComment && this.currentUser.name !== this.currentComment.author)) return actions;

      if (this.currentIndex === 0 && this.currentComment) {
        if (this.currentComment.status !== 'resolved') {
          actions.push({
            action: () => {
              this.updateComment(this.currentComment.id, { status: 'resolved' });
            },
            icon: 'check',
            label: 'Mark as resolved',
          });
        }
        if (this.currentComment.status !== 'important') {
          actions.push({
            action: () => {
              this.updateComment(this.currentComment.id, { status: 'important' });
            },
            icon: 'warning',
            label: 'Mark as important',
          });
        }
        if (this.currentComment.status !== 'critical') {
          actions.push({
            action: () => {
              this.updateComment(this.currentComment.id, { status: 'critical' });
            },
            icon: 'error',
            label: 'Mark as critical',
          });
        }
      }

      if (this.currentIndex === 0 && this.currentComment && this.currentComment.status) {
        actions.push({
          action: () => {
            this.updateComment(this.currentComment.id, { status: null });
            this.contextActionJustPerformed = true;
          },
          icon: 'cross',
          label: 'Clear status',
        });
      }

      // TODO: Add option to edit comment content, maybe by pulling the current content into the reply field and changing the button label to save

      if (this.currentComment) {
        actions.push({
          action: () => {
            this.deleteComment(this.currentComment.id, this.currentIndex === 0);
          },
          icon: 'trash',
          label: this.currentIndex === 0 ? 'Delete comment thread' : 'Delete comment',
          type: 'negative',
        });
      }

      return actions;
    },
  },
  data() {
    return {
      commentActions: {
        fromRight: false,
        show: false,
        target: null,
        x: 0,
        y: 0,
      },
      currentComment: null,
      currentIndex: null,
      reply: {
        content: null,
        loading: false,
      },
    };
  },
  emits: ['add-reply', 'close', 'delete-comment', 'update-comment'],
  methods: {
    addReply() {
      if (!this.reply || !this.reply.content || this.reply.content === '<p></p>') return;

      document.activeElement.blur(); // need to blur the editor so we can reset its contents

      const comment = {
        id: Math.random().toString(36).substring(2, 9),
        author: this.currentUser.name,
        parent: this.comments[0].id,
        content: this.reply.content,
        position: null,
        status: null,
        created: Date.now(),
        updated: null,
      };

      this.$emit('add-reply', comment);
      this.reply.content = null;
    },
    deleteComment(id, toplevel) {
      this.$emit('delete-comment', { id, toplevel });
      if (toplevel) this.$emit('close');
    },
    formatTimestamp,
    handleClose() {
      this.commentActions.show = false;
      this.$emit('close');
    },
    handleContextMenuClose() {
      this.commentActions.show = false;
    },
    openMenu(e, comment, index) {
      if (this.commentActions.show) return; // close if open already

      this.currentComment = comment;
      this.currentIndex = index;
      if (!this.canComment || this.commentActions.show || this.modifiedCommentActions.length < 1) return; // close it first or abort if there’s nothing to display
      if (e.type === 'contextmenu') {
        this.commentActions.x = e.clientX;
        this.commentActions.y = e.clientY;
        this.commentActions.fromRight = false;
      } else {
        const rect = e.target.getBoundingClientRect();
        this.commentActions.fromRight = true;
        this.commentActions.x = rect.right;
        this.commentActions.y = rect.top;
      }
      this.commentActions.target = e.currentTarget;
      this.commentActions.show = true;
    },
    updateComment(id, changes) {
      this.$emit('update-comment', { id, changes });
    },
  },
  props: {
    canComment: Boolean,
    comments: Array,
    dark: Boolean,
    visible: Boolean,
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
  },
  watch: {
    visible(nv) {
      if (!nv) this.commentActions.show = false;
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .preview-comment-thread {
    &.dark {
      .comments .comment {
        background-color: var(--bg-tertiary-dark);

        &:not(:last-child) {
          border-bottom-color: var(--bg-tertiary-dark);
        }

        header {
          .author {
            color: var(--text-secondary-dark);
          }

          .timestamp {
            color: var(--text-tertiary-dark);
          }
        }
      }
    }

    .thread-status {
      padding: 0.5rem;
      padding-bottom: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;

      &.resolved .icon {
        box-shadow: inset 0 0 0, rem(1) var(--positive-saturated);
        color: var(--positive-saturated);
      }

      &.important .icon {
        color: var(--warning-saturated);
        padding: 0;
        border-radius: 0;
      }

      &.critical .icon {
        color: var(--negative);
        padding: 0;
      }

      .icon {
        border-radius: 50%;
        padding: rem(4);
        width: rem(24);
        height: rem(24);
      }
    }

    .comments {
      max-height: 50vh;

      .scroll-wrapper {
        margin: 0;
        padding: rem(8);
        width: rem(440);
        list-style: none;
      }

      .comment {
        max-width: 100%;
        padding: rem(12);
        padding-bottom: rem(18);
        background-color: var(--bg-secondary);
        border-radius: var(--radius-m);
        border-bottom-right-radius: 0;

        &.owned {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: var(--radius-m);
        }

        &:not(:last-child) {
          margin-bottom: rem(8);
        }

        header {
          display: flex;
          align-items: center;
          user-select: none;
          margin-bottom: rem(8);

          .author,
          .timestamp {
            font-size: rem(12);
          }

          .author {
            max-width: 60%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--text-secondary);
          }

          .timestamp {
            color: var(--text-tertiary);
            margin-left: auto;
          }

          .button {
            padding: rem(8);
            margin-left: rem(8);
            margin-right: rem(-4);

            &:deep(.icon) {
              width: 1rem;
              height: 1rem;
            }
          }
        }

        .content {
          > :first-child {
            margin-top: 0;
          }

          > :last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    footer {
      .button-wrapper {
        display: flex;
        padding: 0.5rem;

        .button {
          width: 100%;

          @media #{$mobile} {
            min-width: 0;
          }

          &:not(:last-child) {
            margin-right: 0.5rem;
          }
        }
      }
    }

    .editor {
      max-width: 100%;
      width: rem(440);
      border-top: 1px solid color-mix(in srgb, var(--accent-secondary) 25%, transparent);

      &.dark {
        border-top-color: var(--bg-tertiary-dark-lightened-10);
      }

      &:deep(.content-wrapper) {
        border-radius: 0;

        &:not(:focus-within):not(.error) {
          box-shadow: inset 0, rem(-1) 0 0 color-mix(in srgb, var(--accent-secondary) 25%, transparent);
        }

        &.dark {
          background-color: var(--bg-tertiary-dark);

          &:not(:focus-within):not(.error) {
            box-shadow: inset 0 0.0625rem 0 0 var(--bg-tertiary-dark-lightened-10),
            inset 0, rem(-1) 0 0 var(--bg-tertiary-dark-lightened-10);
          }

          code {
            background-color: var(--bg-tertiary-dark-lightened-10);
          }
        }
      }

      &:deep(.toolbar) {
        margin-top: 0;
        top: 0;
        border-radius: 0;

        .tool-group:nth-child(2) {
          display: none;
        }
      }
    }
  }
</style>
