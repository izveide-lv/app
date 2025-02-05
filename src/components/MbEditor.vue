<template>
  <div class="editor" :class="{ dark, disabled }">
    <div v-if="outputFormat !== 'text'" class="toolbar" :class="{ dark }">
      <MbScroller>
        <div class="scroll-wrapper">
          <div class="tool-group">
            <MbButton :dark="dark" icon="undo" :disabled="undoDepth === 0" :tooltip="{ message: `Undo <kbd>${isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>Z</kbd>`, position: 'top' }" @click="undo" />
            <MbButton :dark="dark" icon="redo" :disabled="redoDepth === 0" :tooltip="{ message: `Redo <kbd>${isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>Y</kbd>`, position: 'top' }" @click="redo" />
          </div>
          <div v-if="formats.block" class="tool-group">
            <MbSelect class="paragraph-type" :dark="dark" :disabled="cleanActiveParagraphType === 'Document Block' || disabled || raw" :model-value="cleanActiveParagraphType" :options="paragraphTypes" :refocus="false" :tooltip="{ message: 'Paragraph type', position: 'top'}" @update:model-value="setParagraphType" />
            <MbSelect v-if="activeParagraphType === 'codeBlock'" class="paragraph-type" :dark="dark" :disabled="disabled || raw" :model-value="activeCodeLang" :options="codeLangs" placeholder="No Language" :refocus="false" :tooltip="{ message: 'Code Block Language', position: 'top' }" @update:model-value="setCodeBlockLang" />
          </div>
          <div v-for="(actions, name) in visibleToolbarActions" class="tool-group" :key="name">
            <MbButton v-for="action in actions" :dark="dark" :disabled="disabledActions[action.name] || disabled || raw" :icon="action.icon" :key="action.name" :type="activeMarks.includes(action.name) || (action.name === 'image' && activeParagraphType === 'image') ? 'primary' : null" :tooltip="{ message: action.tooltip, position: 'top' }" @click="action.action" />
          </div>
          <div v-if="allowRaw" class="tool-group align-right">
            <MbButton v-show="raw && outputFormat === 'html'" :dark="dark" :disabled="disabled && raw" icon="text" :tooltip="{ message: 'Clean up code', position: 'top' }" @click="prettifyCode" />
            <MbToggle v-model="raw" :dark="dark" :disabled="disabled" :icons="['text-alt', 'code']" tooltip="Toggle raw editing mode" />
          </div>
        </div>
      </MbScroller>
    </div>
    <label class="content-wrapper" :class="{ dark, disabled, dirty: error || modelValue || placeholder, error: error || maxLen && overlength, raw, rich: outputFormat !== 'text', warn }" @click="outputFormat !== 'text' && !raw && !editorView.hasFocus() ? editorView.focus() : null">
      <span v-if="displayLabel" class="label" :class="{ right: !label && maxLen }">{{displayLabel}}</span>
      <div v-if="outputFormat === 'text' || raw" class="autogrow-area" ref="autogrow">
        <pre ref="pre"></pre>
        <textarea autocomplete="off" :disabled="disabled" :lang="lang" :placeholder="placeholder" ref="textarea" :value="cleanValue" @input="handleTextareaInput" @[preventEnter].enter.prevent></textarea>
      </div>
      <template v-else>
        <div class="editor-wrapper" :lang="lang" ref="editor" />
        <div v-if="placeholder && showPlaceholder" class="placeholder" :class="[ placeholderFormatting ]">{{placeholder}}</div>
        <div v-show="caretVisible" class="fake-caret" :class="[ placeholderFormatting ]" :style="{ height: caretHeight, transform: caretTransform }" />
      </template>
    </label>
    <MbPopover v-if="outputFormat !== 'text'" class="add-link" center-x :dark="dark" :visible="linkPopover.visible" :x="linkPopover.x" :y="linkPopover.y" @close="linkPopover.visible = false" @after-close="closeLinkPopover" @keyup.ctrl.enter="addLink">
      <template #header>
        <h3>{{linkPopover.editing ? 'Edit' : 'Add'}} Link</h3>
      </template>
      <MbSegmentedSelector v-if="linkTypeOptions.length > 1" v-model="linkPopover.type" :dark="dark" :options="linkTypeOptions" />
      <transition mode="out-in">
        <MbInput v-if="linkPopover.type === 'external'" v-model="linkPopover.href" :dark="dark" icon="link" label="Link URL" ref="linkHref" />
        <InternalLinkHelper v-else v-model="linkPopover.href" class="internal-link" :class="{ dark }" :collections-path="linkOptions.collectionsPath" :dark="dark" :lang="lang" removable :url-suffix="linkOptions.urlSuffix" :url-template="linkOptions.urlTemplate" :use-file-path="linkOptions.useFilePath" />
      </transition>
      <MbInput v-model="linkPopover.title" :dark="dark" icon="text" label="Link Title (optional)" />
      <MbToggle v-if="outputFormat === 'html' && !this.linkOptions.forceBlankTarget" v-model="linkPopover.newTab" :dark="dark">Open link in a new tab</MbToggle>
      <MbToggle v-if="outputFormat === 'html' && !this.linkOptions.forceNofollow" v-model="linkPopover.nofollow" :dark="dark">Include “nofollow” hint</MbToggle>
      <MbButton v-show="linkPopover.editing" class="remove-link" :dark="dark" icon="trash" :icon-first="false" type="negative" @click="removeLink">Remove Link</MbButton>
      <template #footer>
        <MbButton :dark="dark" @click="linkPopover.visible = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="!linkPopover.href" type="primary" @click="addLink">{{linkPopover.editing ? 'Save' : 'Add'}}</MbButton>
      </template>
    </MbPopover>
    <MbPopover v-if="outputFormat !== 'text'" class="edit-image" center-x :dark="dark" :visible="imagePopover.visible" :x="imagePopover.x" :y="imagePopover.y" @close="imagePopover.visible = false" @after-close="closeImagePopover" @keyup.ctrl.enter="setImageAttributes">
      <template #header>
        <h3>Edit Image</h3>
      </template>
      <MbFieldsEditor v-if="imagePopover.content" v-model="imagePopover.content" v-model:error="imagePopover.errors" :dark="dark" compact :fields="imageMetaFields" in-split :languages="lang && [lang]" />
      <MbButton class="replace-image" :dark="dark" icon="replace-round" :icon-first="true" @click="replaceImage">Replace Image</MbButton>
      <template #footer>
        <MbButton :dark="dark" @click="imagePopover.visible = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="imagePopover.errors.size !== 0" type="primary" @click="setImageAttributes">Save</MbButton>
      </template>
    </MbPopover>
    <MediaSelectModal v-if="outputFormat !== 'text'" :dark="dark" :no-meta="outputFormat !== 'html'" :reset-focus="false" :selected-file-path="currentImagePath" :visible="showMediaSelectModal" @close="handleMediaSelectClose" @file-selected="handleImageSelected" @update-meta-is-new="imageMetaIsNew = $event" />
  </div>
</template>

<script>
import {
  baseKeymap, lift, setBlockType, toggleMark, wrapIn,
} from 'prosemirror-commands';
import { DOMParser, DOMSerializer } from 'prosemirror-model';
import { dropCursor } from 'prosemirror-dropcursor';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { gapCursor } from 'prosemirror-gapcursor';
import { history, redo, redoDepth, undo, undoDepth } from 'prosemirror-history'; // eslint-disable-line object-curly-newline
import { inputRules } from 'prosemirror-inputrules';
import { cloneDeep, isEqual, debounce } from 'lodash-es';
import { keymap } from 'prosemirror-keymap';
import { liftListItem, sinkListItem, wrapInList } from 'prosemirror-schema-list';

import fs, { joinPath } from '../fs';

import cleanField from '../assets/js/cleanField';
import defaultFields from '../data/defaultFields';
import formatHTML from '../assets/js/formatHTML';
import generateInputRules from '../assets/js/generateInputRules';
import generateKeymap, { insertBreak, insertHr } from '../assets/js/generateKeymap';
import generateSchema from '../assets/js/generateSchema';
import isMac from '../assets/js/isMac';
import MarkdownParser from '../assets/js/MarkdownParser';
import MarkdownSerializer from '../assets/js/MarkdownSerializer';
import PmImageView from '../assets/js/PmImageView';

import InternalLinkHelper from './utility/InternalLinkHelper.vue';
import MediaSelectModal from './utility/MediaSelectModal.vue';
import validateContent from '../assets/js/validateContent';

export default {
  beforeUnmount() {
    if (this.outputFormat !== 'text' && !this.raw) this.destroyProseMirror();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  },
  components: {
    InternalLinkHelper,
    MediaSelectModal,
  },
  computed: {
    cleanActiveParagraphType() {
      if (
        ['paragraph', 'codeBlock', 'quoteFooter'].includes(this.activeParagraphType)
        || this.activeParagraphType.includes('heading')
      ) return this.activeParagraphType;
      if (this.activeParagraphType === 'image') return 'Image';
      return 'Document Block';
    },
    cleanValue() {
      if (!this.modelValue) return '';
      if (this.allowNewLines) return this.modelValue;
      return this.modelValue.replace(/\n+/g, ' ');
    },
    disabledActions() {
      const disabled = {};
      if (this.selectionEmpty && !this.activeMarks.includes('link')) disabled.link = true;
      if (this.activeParentType !== 'listItem') {
        disabled.indent = true;
        disabled.outdent = true;
      }
      if (this.activeParagraphType === 'codeBlock') {
        disabled.code = true;
        disabled.em = true;
        disabled.link = true;
        disabled.ol = true;
        disabled.strike = true;
        disabled.strong = true;
        disabled.ul = true;
        disabled.image = true;
        disabled.br = true;
      }
      if (this.activeParentType === 'listItem' || this.activeParagraphType === 'listItem' || this.activeParagraphType === 'quoteFooter') {
        disabled.ol = true;
        disabled.ul = true;
        disabled.blockquote = true;
        disabled.image = true;
        disabled.br = true;
      }
      if (['blockquote', 'orderedList', 'unorderedList'].includes(this.activeParagraphType)) {
        disabled.ol = true;
        disabled.ul = true;
        disabled.image = true;
      }
      if (this.activeParentType === 'blockquote' && this.activeParagraphType !== 'quoteFooter') {
        disabled.outdent = false;
      }
      if (this.activeParagraphType === 'image') {
        disabled.ol = true;
        disabled.ul = true;
        disabled.br = true;
      }
      return disabled;
    },
    displayLabel() {
      if (this.error) return this.error;
      if (this.maxLen && (this.error || this.modelValue || this.placeholder)) {
        if (this.label) return `${this.label} (${this.outputFormat === 'text' ? this.modelValue.length : this.contentLength}/${this.maxLen})`;
        return `(${this.outputFormat === 'text' ? this.modelValue.length : this.contentLength}/${this.maxLen})`;
      }
      if (this.label) return this.label;
      return false;
    },
    imageMetaFields() {
      if (this.outputFormat !== 'html' || !this.mediaSettings.advanced || !this.mediaSettings.customFields) {
        const textField = defaultFields.find((field) => field.type === 'text');
        const altField = cleanField(textField);
        const titleField = cleanField(textField);

        altField.key = 'alt';
        altField.label = 'Alternative Text';

        titleField.key = 'title';
        titleField.label = 'Title';

        return [altField, titleField];
      }
      return this.mediaSettings.customFields;
    },
    linkTypeOptions() {
      if (this.linkOptions.only === 'external' || !this.linkOptions.collectionsPath) return [{ label: 'External', value: 'external' }];
      if (this.linkOptions.only === 'internal') return [{ label: 'Internal', value: 'internal' }];
      return [{ label: 'External', value: 'external' }, { label: 'Internal', value: 'internal' }];
    },
    isMac() {
      return isMac();
    },
    mediaSettings() {
      return this.$store.state.currentProject.media;
    },
    overlength() {
      if (this.outputFormat === 'text') return this.modelValue && this.modelValue.length > this.maxLen;
      return this.contentLength > this.maxLen;
    },
    paragraphTypes() {
      const types = [
        {
          label: 'Paragraph',
          value: 'paragraph',
        },
      ];

      if (this.activeParentType === 'listItem') return types; // lists don’t allow for block content

      if (this.formats.block && this.formats.block.includes('heading')) {
        for (let i = Math.max(1, this.formatOptions.minHeading); i <= Math.min(6, this.formatOptions.maxHeading); i += 1) {
          types.push({
            label: `Heading ${i}`,
            value: `heading${i}`,
          });
        }
      }

      if (this.formats.block && this.formats.block.includes('codeBlock')) {
        types.push({
          label: 'Code Block',
          value: 'codeBlock',
        });
      }

      if (this.outputFormat === 'html' && this.formats.block && this.formats.block.includes('blockquote') && this.formatOptions.allowQuoteFooters && this.activeParentType === 'blockquote') {
        types.push({
          label: 'Quote Footer',
          value: 'quoteFooter',
        });
      }

      return types;
    },
    placeholderFormatting() {
      if (this.activeParagraphType.startsWith('heading')) {
        const level = this.activeParagraphType.slice(-1);
        return `h${level}`;
      }
      if (this.activeParagraphType === 'codeBlock') {
        if (this.activeCodeLang) return 'code-lang';
        return 'code';
      }
      return '';
    },
    preventEnter() {
      if (this.allowNewLines) return null;
      return 'keydown';
    },
    projectsDir() {
      return joinPath('/projects', this.$store.state.currentProject.id);
    },
    userMediaPermissions() {
      if (!this.mediaSettings.permissions || !this.$store.getters.userInCurrentProject) return new Set();

      const { role } = this.$store.getters.userInCurrentProject;

      return new Set([
        ...(this.mediaSettings.permissions.everybody || []),
        ...(this.mediaSettings.permissions[role] || []),
      ]);
    },
    visibleToolbarActions() { // OPTIMIZE: gets recomputed after every edit at the moment
      return this.toolbarActions.filter((a) => !this.disabledActions[a.name]).reduce((acc, action) => {
        if (!acc[action.group]) acc[action.group] = [action];
        else acc[action.group].push(action);
        return acc;
      }, {});
    },
  },
  data() {
    return {
      activeMarks: [],
      activeCodeLang: null,
      activeParagraphType: 'paragraph',
      activeParentType: null,
      caretHeight: '',
      caretTransform: '',
      caretVisible: false,
      contentLength: 0,
      currentImagePath: null,
      focussed: false,
      imageBeingReplaced: false,
      imageMetaIsNew: false,
      imagePopover: {
        content: null,
        errors: new Map(),
        visible: false,
        x: 0,
        y: 0,
      },
      linkPopover: {
        editing: false,
        href: '',
        newTab: false,
        nofollow: true,
        title: '',
        type: 'external',
        visible: false,
        x: 0,
        y: 0,
      },
      markdownParser: null,
      markdownSerializer: null,
      observer: null,
      raw: false,
      redoDepth: 0,
      renderDiv: null,
      selectionEmpty: true,
      showMediaSelectModal: false,
      showPlaceholder: true,
      toolbarActions: [],
      undoDepth: 0,
    };
  },
  emits: ['update:modelValue'],
  methods: {
    addLink() {
      const {
        href, newTab, nofollow, title,
      } = this.linkPopover;
      if (!href) return;
      const attrs = {
        href,
        rel: null,
        target: newTab ? '_blank' : null,
        title: title || null,
      };

      if (nofollow) {
        if (newTab) attrs.rel = 'nofollow noopener noreferrer';
        else attrs.rel = 'nofollow';
      } else if (newTab) attrs.rel = 'noreferrer noopener';

      const linkType = this.editorState.schema.marks.link;
      if (this.activeMarks.includes('link')) this.setMark(linkType); // toggle it off, hacky
      this.setMark(linkType, attrs);
      this.linkPopover.visible = false;
    },
    closeImagePopover() {
      this.imagePopover = {
        content: null,
        errors: new Map(),
        visible: false,
        x: 0,
        y: 0,
      };
      this.imageMetaIsNew = false; // ensure that imageMetaIsNew is false in case we cancelled out of a popover while it was true
      this.editorView.focus();
    },
    closeLinkPopover() {
      this.linkPopover = {
        editing: false,
        href: '',
        newTab: false,
        nofollow: true,
        title: '',
        type: 'external',
        visible: false,
        x: 0,
        y: 0,
      };
      this.editorView.focus();
    },
    debouncedUpdate: debounce(function update() {
      this.$emit('update:modelValue', this.getContentString());
    }, 500),
    destroyProseMirror() {
      this.editorView.destroy();
      this.editorView = null;
      this.editorState = null;
    },
    focus() {
      if (this.outputFormat === 'text' || this.raw) this.$refs.textarea.focus();
      else this.editorView.focus();
    },
    generateActions(schema) {
      if (this.outputFormat === 'text') return [];
      const actions = [];
      let type;

      /* eslint-disable no-cond-assign */
      // Reason: it’s very convenient to check if a type exists in a schema this way
      if (type = schema.marks.strong) {
        const strong = type;
        actions.push({
          action: () => this.setMark(strong),
          group: 'formatting',
          name: 'strong',
          icon: 'bold',
          tooltip: `Toggle bold <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>B</kbd>`,
        });
      }
      if (type = schema.marks.em) {
        const em = type;
        actions.push({
          action: () => this.setMark(em),
          group: 'formatting',
          name: 'em',
          icon: 'italic',
          tooltip: `Toggle italics <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>I</kbd>`,
        });
      }
      if (type = schema.marks.strike) {
        const strike = type;
        actions.push({
          action: () => this.setMark(strike),
          group: 'formatting',
          name: 'strike',
          icon: 'strikethrough',
          tooltip: `Toggle strikethrough <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>S</kbd>`,
        });
      }
      if (type = schema.marks.code) {
        const code = type;
        actions.push({
          action: () => this.setMark(code),
          group: 'formatting',
          name: 'code',
          icon: 'inline-code',
          tooltip: `Toggle code font <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>`,
        });
      }
      if (type = schema.marks.link) {
        // const link = type;
        actions.push({
          action: this.openLinkPopover,
          group: 'formatting',
          name: 'link',
          icon: 'link',
          tooltip: `Insert link <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>K</kbd>`,
        });
      }
      if (type = schema.nodes.unorderedList) {
        const ul = type;
        actions.push({
          action: () => this.insertList(ul),
          group: 'block-formats',
          name: 'ul',
          icon: 'bullet-list',
          tooltip: `Format as bullet list <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>Shift</kbd>+<kbd>8</kbd>`,
        });
      }
      if (type = schema.nodes.orderedList) {
        const ol = type;
        actions.push({
          action: () => this.insertList(ol),
          group: 'block-formats',
          name: 'ol',
          icon: 'number-list',
          tooltip: `Format as numbered list <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>Shift</kbd>+<kbd>9</kbd>`,
        });
      }
      if (type = schema.nodes.image) {
        actions.push({
          action: this.openImagePopover,
          group: 'block-formats',
          name: 'image',
          icon: 'image',
          tooltip: `Insert an image <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>`,
        });
      }
      if (type = schema.nodes.blockquote) {
        actions.push({
          action: this.insertBlockquote,
          group: 'block-formats',
          name: 'blockquote',
          icon: 'blockquote',
          tooltip: `Format as quote <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>&gt;</kbd>`,
        });
      }
      if (this.formatOptions.allowNestedLists && (schema.nodes.unorderedList || schema.nodes.orderedList)) {
        actions.push({
          action: () => sinkListItem(schema.nodes.listItem)(this.editorState, this.editorView.dispatch),
          group: 'block-formats',
          name: 'indent',
          icon: 'indent',
          tooltip: 'Indent list item <kbd>Tab</kbd>',
        });
      }
      if ((this.formatOptions.allowNestedLists && (schema.nodes.unorderedList || schema.nodes.orderedList)) || schema.nodes.blockquote) {
        actions.push({
          action: () => {
            if (this.activeParagraphType === 'listItem') liftListItem(schema.nodes.listItem)(this.editorState, this.editorView.dispatch);
            else lift(this.editorState, this.editorView.dispatch);
          },
          group: 'block-formats',
          name: 'outdent',
          icon: 'outdent',
          tooltip: 'Outdent list item <kbd>Shift</kbd>+<kbd>Tab</kbd>',
        });
      }
      if (type = schema.nodes.horizontalRule) {
        actions.push({
          action: this.insertHr,
          group: 'inserts',
          name: 'hr',
          icon: 'add-separator',
          tooltip: `Insert separator <kbd>${this.isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>_</kbd>`,
        });
      }
      if (type = schema.nodes.br) {
        actions.push({
          action: this.insertBreak,
          group: 'inserts',
          name: 'br',
          icon: 'line-break',
          tooltip: 'Insert line break <kbd>Shift</kbd>+<kbd>Enter</kbd>',
        });
      }
      /* eslint-enable no-cond-assign */

      return actions.filter((action) => action);
    },
    getContentString() {
      if (this.outputFormat === 'html' || this.outputFormat === 'markdown') {
        if (!this.renderDiv) this.renderDiv = document.createElement('div');
        const htmlFragment = DOMSerializer.fromSchema(this.editorView.state.schema).serializeFragment(this.editorState.doc);
        this.renderDiv.appendChild(htmlFragment);
        let result;

        if (this.outputFormat === 'html') result = this.renderDiv.innerHTML;
        else result = this.markdownSerializer.serialize(this.renderDiv);

        this.renderDiv.innerHTML = ''; // clean up the render div since it’s being reused
        // this.contentLength = this.editorState.doc.textContent.length; // less accurate, but probably more performant
        this.contentLength = this.editorState.doc.textBetween(0, this.editorState.doc.content.size, '\n').length;
        return result;
      }
      return this.modelValue; // if it’s text
    },
    handleImageSelected(data) {
      const cleanImageAttrs = this.transformImageDataToAttrs(data);
      if (!this.imageBeingReplaced) {
        // if adding a new image, add the image
        const { tr } = this.editorState;
        const image = this.editorState.schema.nodes.image.createAndFill(cleanImageAttrs, this.formatOptions.allowImageCaptions && data.caption ? this.editorState.schema.text(data.caption) : null);
        tr.replaceSelectionWith(image);

        // NOTE: this code is largely based on trial and error, so there may be some edge-cases in which the selection doesn’t get set correctly
        let foundBefore;
        let found;
        tr.doc.nodesBetween(0, tr.selection.$anchor.nodeAfter === image ? tr.selection.head : tr.selection.anchor, (node, pos) => { // if the node after the selection anchor is the image we just inserted, we use the selection head, which points after the inserted image
          if (node.type.name === 'image') {
            if (found) foundBefore = found; // HACK: since when captions are enabled the image after the one we want gets selected, we store the previous one here
            found = { node, pos };
          }
          if (found) return false;
          return true;
        });
        if (found) {
          if (foundBefore && foundBefore.pos && foundBefore.node === image) tr.setSelection(NodeSelection.create(tr.doc, foundBefore.pos)); // in some cases (like when captions are enabled) we want to select the second to last found image
          else tr.setSelection(NodeSelection.create(tr.doc, found.pos)); // but if it isn’t the one we want, we select the last one found
        }

        this.editorView.dispatch(tr.scrollIntoView());
      } else {
        const { selection, tr } = this.editorState;
        tr.setNodeMarkup(selection.anchor, null, cleanImageAttrs);
        tr.setSelection(NodeSelection.create(tr.doc, selection.anchor));
        this.editorView.dispatch(tr.scrollIntoView());
      }
      this.openImagePopover();
    },
    handleMediaSelectClose() {
      this.showMediaSelectModal = false;
      if (this.imageBeingReplaced) {
        this.imageBeingReplaced = false;
        this.currentImagePath = null;
      }
    },
    handleSelectionChange(newSelection) {
      // Update fake caret
      if (newSelection.empty) {
        const selectionRect = this.editorView.coordsAtPos(newSelection.from, 1);
        const editorRect = this.$refs.editor.getBoundingClientRect();
        const caretHeight = selectionRect.bottom - selectionRect.top;

        this.caretVisible = true;
        if (caretHeight !== this.caretHeight) this.caretHeight = `${caretHeight}px`;
        this.caretTransform = `translate(${selectionRect.left - editorRect.left}px, ${selectionRect.top - editorRect.top}px)`;
      } else this.caretVisible = false;
      // Update active Marks
      if (newSelection.empty) {
        this.activeMarks = Object.keys(this.editorState.schema.marks).reduce((marks, name) => {
          const currentMark = this.editorState.schema.marks[name];
          if (currentMark.isInSet(this.editorState.storedMarks || newSelection.$from.marks())) marks.push(name);
          return marks;
        }, []);
      } else {
        this.activeMarks = Object.keys(this.editorState.schema.marks).reduce((marks, name) => {
          if (this.editorState.doc.rangeHasMark(newSelection.from, newSelection.to, this.editorState.schema.marks[name])) {
            marks.push(name);
          }
          return marks;
        }, []);
      }
      // Update active node type
      this.activeParagraphType = newSelection.node ? newSelection.node.type.name : newSelection.$from.parent.type.name;
      this.activeParentType = newSelection.$from.node(-1) && newSelection.$from.node(-1).type.name;

      // Update selection length
      this.selectionEmpty = newSelection.empty;

      if (this.activeParagraphType === 'codeBlock') this.activeCodeLang = newSelection.node ? newSelection.node.attrs.lang || null : newSelection.$from.parent.attrs.lang || null;
    },
    handleTextareaInput(e) {
      let newValue = e.target.value;

      if (!this.allowNewLines) newValue = newValue.replace(/\n+/g, ' ');

      this.$emit('update:modelValue', newValue);
    },
    insertBlockquote() {
      wrapIn(this.editorState.schema.nodes.blockquote)(this.editorState, this.editorView.dispatch);
      this.editorView.focus();
    },
    insertBreak() {
      insertBreak(this.editorState, this.editorView.dispatch);
      this.editorView.focus();
    },
    insertHr() {
      insertHr(this.editorState, this.editorView.dispatch);
      this.editorView.focus();
    },
    insertList(type) {
      wrapInList(type)(this.editorState, this.editorView.dispatch);
      this.editorView.focus();
    },
    looksLikeUrl(value) {
      if (!value || typeof value !== 'string') return false;

      return value.startsWith('/')
      || value.startsWith('#')
      || /^tel:\+{0,1}[-0-9]+$/.test(value)
      || /^(?:https?:\/\/|mailto:)(?:www\.)?(?:[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}|localhost:[0-9]+|[.0-9]+:[0-9]+)\b([-a-zA-Z0-9@:%_+.~#?&//=]*$)/.test(value); // Regex source: https://graphcms.com/user-guides/working-with/field-validations, adjusted to work for mailto and localhost / IP addresses by me. Still breaks on invalid TLDs if there’s a path attached, but should still be fine for most usecases
    },
    openLinkPopover() {
      const { doc, schema } = this.editorState;
      let { selection } = this.editorState;
      if (!this.activeMarks.includes('link') && (!selection || selection.empty || selection.node)) return false;

      if (this.activeMarks.includes('link')) {
        const $pos = selection.$from;
        const { parent, parentOffset } = $pos;
        const start = parent.childAfter(parentOffset);

        if (start.node && start.node.marks.find((mark) => mark.type === schema.marks.link)) {
          let startIndex = $pos.index();
          let startPos = $pos.start() + start.offset;
          let endIndex = startIndex + 1;
          let endPos = startPos + start.node.nodeSize;

          while (startIndex > 0 && schema.marks.link.isInSet(parent.child(startIndex - 1).marks)) {
            startIndex -= 1;
            startPos -= parent.child(startIndex).nodeSize;
          }

          while (endIndex < parent.childCount && schema.marks.link.isInSet(parent.child(endIndex).marks)) {
            endPos += parent.child(endIndex).nodeSize;
            endIndex += 1;
          }

          const $anchor = doc.resolve(startPos);
          const $head = doc.resolve(endPos);
          const newSelection = new TextSelection($anchor, $head);

          this.editorView.dispatch(this.editorState.tr.setSelection(newSelection));
          selection = this.editorState.selection; // update the selection to the newest value after the transaction
          const {
            href, rel, target, title,
          } = selection.$from.parent.childAfter(selection.$from.parentOffset).node.marks.find((mark) => mark.type === schema.marks.link).attrs;

          this.linkPopover.editing = true;
          this.linkPopover.href = href;
          this.linkPopover.title = title || '';
          if (target === '_blank') this.linkPopover.newTab = true;
          else this.linkPopover.newTab = false;
          if (rel && rel.includes('nofollow')) this.linkPopover.nofollow = true;
          else this.linkPopover.nofollow = false;
          if (!this.linkOptions.collectionsPath || (href && (href.startsWith('http') || href.startsWith('tel') || href.startsWith('mailto') || href.startsWith('#')))) this.linkPopover.type = 'external'; // default to external link if we don’t have a collections path
          else this.linkPopover.type = 'internal';
        }
      }

      // force the link type if it’s the only type allowed
      if (this.linkOptions.only === 'internal') this.linkPopover.type = 'internal';
      if (this.linkOptions.only === 'external') this.linkPopover.type = 'external';

      // force target and nofollow if set
      if (this.linkOptions.forceBlankTarget) this.linkPopover.newTab = true;
      if (this.linkOptions.forceNofollow) this.linkPopover.nofollow = true;

      const start = this.editorView.coordsAtPos(selection.from);
      const end = this.editorView.coordsAtPos(selection.to);
      const { bottom } = end;
      const left = Math.max((start.left + end.left) / 2, start.left + 3);
      this.linkPopover.x = left;
      this.linkPopover.y = bottom + 0.5 * Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10);
      this.linkPopover.visible = true;
      if (this.linkPopover.type === 'external') this.$nextTick(() => this.$refs.linkHref.$refs.input.focus());
      return true; // mark the event as handled
    },
    openImagePopover() {
      // show a popover that allows adding / editing an image
      const { doc, selection } = this.editorState;

      if ((!selection.node && selection.$from.parent.type.name !== 'image') || (selection.node && selection.node.type.name !== 'image')) {
        this.showMediaSelectModal = true;
      } else {
        // otherwise open a popover that allows changing Advanced Media Library fields
        if (!selection.node) this.editorView.dispatch(this.editorState.tr.setSelection(NodeSelection.create(doc, selection.$from.pos - selection.$from.parentOffset - 1))); // select the entire node, which starts at selection position - parentOffset - 1

        const { selection: currentSelection } = this.editorState; // we need to get the updated selection here so it is current if we dispatched a transaction
        const { attrs } = currentSelection.node;
        const { left, top, width } = this.editorView.nodeDOM(currentSelection.from).getBoundingClientRect();
        this.imagePopover.content = {
          ...attrs.data,
          alt: attrs.alt,
          src: attrs.src,
          title: attrs.title,
          width: attrs.width,
          height: attrs.height,
          loading: attrs.loading,
          decoding: attrs.decoding,
        };
        this.imagePopover.x = left + width / 2;
        this.imagePopover.y = top + 4 * Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10);
        this.imagePopover.visible = true;
      }
      return true; // mark the event as handled
    },
    prettifyCode() {
      if (this.outputFormat !== 'html') return;
      this.$emit('update:modelValue', formatHTML(this.modelValue));
    },
    recalculateHeight(modelValue) {
      this.$refs.pre.innerText = modelValue;
      this.$refs.pre.appendChild(document.createElement('BR'));
      this.$refs.autogrow.style.height = `${this.$refs.pre.offsetHeight}px`;
    },
    redo() {
      redo(this.editorState, this.editorView.dispatch);
    },
    reInitializeProseMirror() {
      const schema = generateSchema(this.formats, this.outputFormat === 'markdown' ? { ...this.formatOptions, allowQuoteFooters: false, allowImageCaptions: false } : this.formatOptions);
      this.toolbarActions = this.generateActions(schema);

      if (this.outputFormat === 'markdown') {
        this.markdownParser = new MarkdownParser({ typographer: this.inputRuleOptions && (this.inputRuleOptions.ellipsis || this.inputRuleOptions.dashes), quotes: this.inputRuleOptions && this.inputRuleOptions.autoquotes });
        this.markdownSerializer = new MarkdownSerializer();
      }

      if (!this.renderDiv) this.renderDiv = document.createElement('div');
      if (this.formats.block) this.renderDiv.innerHTML = this.outputFormat === 'html' ? this.modelValue : this.markdownParser.parse(this.modelValue);
      else this.renderDiv.innerHTML = this.outputFormat === 'html' ? this.modelValue.replace(/<\/[^>]*>\s*<[^>]*>/g, ' ') : this.markdownParser.parseInline(this.modelValue);
      const initialContent = DOMParser.fromSchema(schema).parse(this.renderDiv);
      this.renderDiv.innerHTML = ''; // clean up the render div since it’s being reused

      if (initialContent && initialContent.childCount > 0 && (initialContent.firstChild.content.size > 0 || !initialContent.firstChild.isTextblock)) this.showPlaceholder = false;
      const vm = this; // so we have a reference to the view-model
      vm.editorState = EditorState.create({ // doesn’t need to be reactive, is immutable
        doc: initialContent,
        plugins: [
          inputRules({ rules: generateInputRules(schema, { maxHeading: vm.formatOptions.maxHeading, minHeading: vm.formatOptions.minHeading, ...vm.inputRuleOptions }) }),
          dropCursor({ class: 'dropcursor', width: 2 }),
          gapCursor(),
          history(),
          keymap(generateKeymap(schema, vm)),
          keymap(baseKeymap),
        ],
        schema,
      });
      vm.editorView = new EditorView({ mount: vm.$refs.editor }, { // doesn’t need to be reactive, is immutable
        dispatchTransaction(transaction) {
          vm.editorState = vm.editorView.state.apply(transaction);
          vm.editorView.updateState(vm.editorState);
          if (transaction.docChanged) {
            if (transaction.doc.childCount > 0 && vm.showPlaceholder) vm.showPlaceholder = false;
            if (transaction.doc.childCount === 1 && transaction.doc.firstChild.content.size === 0 && transaction.doc.firstChild.isTextblock && !vm.showPlaceholder) vm.showPlaceholder = true;
            vm.redoDepth = redoDepth(vm.editorState);
            vm.undoDepth = undoDepth(vm.editorState);
            vm.debouncedUpdate();
          }
          vm.handleSelectionChange(vm.editorState.selection);
        },
        handleDOMEvents: {
          blur: () => { vm.caretVisible = false; },
          focus: (view) => { vm.handleSelectionChange(view.state.selection); },
        },
        handlePaste: (view, event) => {
          if (event.clipboardData && this.looksLikeUrl(event.clipboardData.getData('Text')) && view.state.selection.from !== view.state.selection.to) {
            view.dispatch(view.state.tr.addMark(
              view.state.selection.from,
              view.state.selection.to,
              view.state.schema.marks.link.create({
                href: event.clipboardData.getData('Text'),
              }),
            ));
            return true;
          }
          return false;
        },
        nodeViews: vm.formats.block && vm.formats.block.includes('image') ? {
          image(node, view, getPos) { return new PmImageView(node, view, getPos, vm.formatOptions.allowImageCaptions && vm.outputFormat === 'html', vm.mediaSettings, vm.projectsDir, (msg) => vm.$store.commit('addToast', msg)); },
        } : null,
        scrollMargin: 128,
        scrollThreshold: 64,
        state: vm.editorState,
        transformPastedHTML(html) {
          if (vm.formats.block) return html;
          return html.replace(/<\/[^>]*>\s*<[^>]*>/g, ' '); // replaces ending and starting tags with a space
        },
        transformPastedText(text) {
          if (vm.formats.block) return text;
          return text.replace(/\n+/g, ' ');
        },
      });
    },
    removeLink() {
      this.setMark(this.editorState.schema.marks.link);
      this.linkPopover.visible = false;
    },
    replaceImage() {
      const { src } = this.imagePopover.content;
      let normalisedSrc = null;
      if (this.mediaSettings.outputPath && src && src.startsWith(this.mediaSettings.outputPath)) normalisedSrc = src.replace(this.mediaSettings.outputPath, this.mediaSettings.dir);
      else normalisedSrc = src;

      this.currentImagePath = joinPath(this.projectsDir, normalisedSrc);

      this.imageBeingReplaced = true;
      this.imagePopover.visible = false;
      this.showMediaSelectModal = true;
    },
    async saveNewImageMeta() {
      if (
        !this.imageMetaIsNew
        || this.outputFormat !== 'html'
        || !this.mediaSettings.advanced
        || !this.mediaSettings.customFields
        || (!this.userMediaPermissions.has('everything') && !this.userMediaPermissions.has('editMedia'))
      ) return;
      try {
        this.imageMetaIsNew = false;
        const mediaMetaDir = joinPath(this.projectsDir, '.mattrbld', 'media');
        const pathInMediaDir = this.mediaSettings.outputPath && this.imagePopover.content.src && this.imagePopover.content.src.startsWith(this.mediaSettings.outputPath) ? this.imagePopover.content.src.replace(this.mediaSettings.outputPath, '') : this.imagePopover.content.src.replace(this.mediaSettings.dir, '');
        const newMeta = cloneDeep(this.imagePopover.content);
        delete newMeta.src;
        await fs.writeFile(joinPath(mediaMetaDir, `${pathInMediaDir}.json`), JSON.stringify(newMeta, null, 2), 'utf8');
        this.$store.commit('addLocallyChangedFile', joinPath(mediaMetaDir, `${pathInMediaDir}.json`));
        this.$store.dispatch('saveAppData');
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving metadata for this image: ${err.message}`, type: 'error' });
      }
    },
    setCodeBlockLang(lang) {
      setBlockType(this.editorState.schema.nodes.codeBlock, { lang })(this.editorState, this.editorView.dispatch);
      this.editorView.focus();
    },
    async setImageAttributes() {
      if (!this.imagePopover.content) {
        this.imagePopover.visible = false;
        return;
      }

      this.imagePopover.errors = validateContent(this.imagePopover.content, { fields: this.imageMetaFields }, this.lang && [this.lang]);
      if (this.imagePopover.errors.size) return;
      if (this.imageMetaIsNew) await this.saveNewImageMeta();

      const cleanImageAttrs = this.transformImageDataToAttrs(this.imagePopover.content);
      const { selection, tr } = this.editorState;
      tr.setNodeMarkup(selection.anchor, null, cleanImageAttrs);
      tr.setSelection(NodeSelection.create(tr.doc, selection.anchor));
      this.editorView.dispatch(tr.scrollIntoView());
      this.imagePopover.visible = false;
    },
    setMark(type, attrs) {
      toggleMark(type, attrs)(this.editorState, this.editorView.dispatch);
      this.editorView.focus();
    },
    setParagraphType(typeName) {
      setBlockType(this.editorState.schema.nodes[typeName])(this.editorState, this.editorView.dispatch);
      this.editorView.focus();
    },
    transformImageDataToAttrs(data) {
      if (typeof data === 'string') return { src: data }; // like when Advanced Media Library is off
      return Object.entries(data).reduce((acc, [key, value]) => {
        if (['alt', 'src', 'title', 'width', 'height', 'loading', 'decoding'].includes(key)) {
          if (key === 'src') acc[key] = this.mediaSettings.outputPath ? value.replace(this.mediaSettings.dir, this.mediaSettings.outputPath) : value;
          else if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (this.lang) acc[key] = value[this.lang];
            else acc[key] = Object.values(value).find((v) => v);
          } else acc[key] = value;
        } else {
          if (!acc.data) acc.data = {};
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (this.lang) acc.data[key] = value[this.lang];
            else acc.data[key] = Object.values(value).find((v) => v);
          } else acc.data[key] = value;
        }
        return acc;
      }, {});
    },
    undo() {
      undo(this.editorState, this.editorView.dispatch);
    },
  },
  mounted() {
    if (this.outputFormat === 'text') {
      if (!this.observer) { // this is needed to initially set the height if the component got initialised in a parent with display: none
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.observer.disconnect();
              this.observer = null;
              this.recalculateHeight(this.cleanValue);
            }
          });
        });
      }
      this.observer.observe(this.$el);
    } else this.reInitializeProseMirror();
  },
  props: {
    allowNewLines: {
      type: Boolean,
      default: true,
    },
    allowRaw: Boolean,
    codeLangs: {
      type: Array,
      default: () => ['html', 'css', 'javascript', 'markdown'],
    },
    dark: Boolean,
    disabled: Boolean,
    error: String,
    formatOptions: {
      type: Object,
      default: () => ({
        minHeading: 1, maxHeading: 6, allowQuoteFooters: true, allowNestedLists: true, allowImageCaptions: true,
      }),
    },
    formats: {
      type: Object,
      default: () => ({ block: ['blockquote', 'codeBlock', 'heading', 'hr', 'orderedList', 'unorderedList'], inline: ['br', 'code', 'em', 'link', 'strike', 'strong'] }),
    },
    inputRuleOptions: Object,
    label: String,
    lang: String,
    linkOptions: {
      type: Object,
      default: () => ({
        collectionsPath: null,
        forceBlankTarget: false,
        forceNofollow: false,
        only: null,
        urlSuffix: null,
        urlTemplate: null,
        useFilePath: false,
      }),
    },
    maxLen: Number,
    modelValue: {
      type: String,
      default: '',
    },
    outputFormat: {
      type: String,
      default: 'text',
      validator: (v) => ['text', 'markdown', 'html'].includes(v),
    },
    placeholder: String,
    warn: Boolean,
  },
  watch: {
    raw(nv) {
      if (nv) {
        this.destroyProseMirror();
        this.$nextTick(() => this.recalculateHeight(this.cleanValue));
      } else this.$nextTick(this.reInitializeProseMirror);
    },
    formats(nv, ov) {
      if (isEqual(nv, ov)) return; // for some reason these watchers fire after every $emit('update:modelValue'), so we avoid reinitialising if nothing changed
      this.destroyProseMirror();
      this.reInitializeProseMirror();
    },
    formatOptions(nv, ov) {
      if (isEqual(nv, ov)) return; // for some reason these watchers fire after every $emit('update:modelValue'), so we avoid reinitialising if nothing changed
      this.destroyProseMirror();
      this.reInitializeProseMirror();
    },
    modelValue(newValue) {
      if (this.outputFormat === 'text' || this.raw) {
        if (this.allowNewLines) this.recalculateHeight(newValue);
        else this.recalculateHeight(newValue.replace(/\n+/g, ' '));
      } else if (!this.editorView.hasFocus()) {
        if (!this.renderDiv) this.renderDiv = document.createElement('div');
        if (this.formats.block) this.renderDiv.innerHTML = this.outputFormat === 'html' ? newValue : this.markdownParser.parse(newValue);
        else this.renderDiv.innerHTML = this.outputFormat === 'html' ? newValue.replace(/<\/[^>]*>\s*<[^>]*>/g, ' ') : this.markdownParser.parseInline(newValue); // replaces ending and starting tags with a space so we don’t get characters sticking together
        const newContent = DOMParser.fromSchema(this.editorView.state.schema).parse(this.renderDiv);
        this.renderDiv.innerHTML = ''; // clean up the render div since it’s being reused
        // Create a new EditorState based on the settings of the one initially created
        const { selection } = this.editorState;
        let newSelection;

        try {
          if (selection instanceof NodeSelection) newSelection = NodeSelection.create(newContent, selection.anchor);
          else if (selection instanceof TextSelection) newSelection = TextSelection.create(newContent, selection.anchor, selection.head);
        } catch (err) {
          // selection couldn’t be restored, probably because the new content is shorter than the old one or doesn't exist
        }

        this.editorState = EditorState.create({
          doc: newContent,
          plugins: this.editorView.state.plugins,
          schema: this.editorView.state.schema,
          selection: newSelection, // restore a selection if there was one, needed for example when adding images and opening the popover after
        });
        this.editorView.updateState(this.editorState);
        if (newValue && this.showPlaceholder) this.showPlaceholder = false;
        if (!newValue && !this.showPlaceholder) this.showPlaceholder = true;
      }
    },
    outputFormat(nv, ov) {
      if (nv === ov) return;
      this.destroyProseMirror();
      this.reInitializeProseMirror();
    },
  },
};
</script>

<style lang="scss">
  @use '../assets/styles/breakpoints' as *;

  .editor {
    .toolbar {
      background-color: var(--bg-tertiary);
      border-radius: var(--radius-m);
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      margin-top: 1.5rem;
      position: sticky;
      top: 0.5rem;
      overflow: hidden;
      z-index: 1;

      &.dark {
        background-color: var(--bg-tertiary-dark);
      }

      .scroll-wrapper {
        padding: 0.5rem;
        display: flex;
        align-items: center;

        &::after  { // so the last item isn’t glued to the right
          content: '';
          display: block;
          width: 0.5rem;
          flex-shrink: 0;
          align-self: stretch;
        }

        .tool-group {
          flex-shrink: 0;

          &.align-right {
            margin-left: auto;
          }

          &:not(:last-child) {
            &::after {
              content: '';
              display: inline-block;
              vertical-align: middle;
              width: 0.0625rem;
              height: 2rem;
              background-color: color-mix(in srgb, var(--accent-secondary) 25%, transparent);
              margin: 0 0.5rem;
            }
          }

          .button.paragraph-type {
            border: none;
            min-width: rem(96);
            flex-shrink: 0;
          }

          .button.icon {
            padding: rem(13);

            &:not(:last-child) {
              margin-right: 0.5rem;
            }

            &:not(.primary):hover {
              background-color: var(--bg-secondary);

              &.dark {
                background-color: var(--bg-secondary-dark);
              }
            }

            &.space-next {
              margin-right: 1rem;
            }
          }

          .toggle {
            margin-left: auto;
          }
        }
      }
    }

    .content-wrapper {
      display: block;
      background-color: var(--bg-secondary);
      border-radius: var(--radius-m);
      padding: 1rem;
      position: relative;
      cursor: text;
      margin-top: 1.5rem;
      border: 1px solid transparent;
      transition: box-shadow 200ms ease;

      &.raw {
        .autogrow-area {
          font-family: monospace;
        }
      }

      &.rich {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        margin-top: 0;
      }

      &.dark {
        background-color: var(--bg-secondary-dark);

        .label {
          color: var(--text-secondary-dark);
        }

        .editor-wrapper.ProseMirror {
          pre,
          code {
            background-color: var(--bg-tertiary-dark);
          }

          figure {
            &.loading {
              background-color: var(--bg-tertiary-dark);
            }

            figcaption {
              &.empty::before {
                color: var(--text-secondary-dark);
              }
            }
          }
        }

        .placeholder {
          color: var(--text-secondary-dark);
        }

        .fake-caret {
          background-color: currentColor;
        }

        .autogrow-area textarea {
          caret-color: currentColor;

          &::placeholder {
            color: var(--text-secondary-dark);
          }
        }
      }

      &.error {
        color: var(--negative-saturated);
        box-shadow: inset 0 0 0 0.125rem var(--negative);

        &:focus-within {
          color: inherit;
        }

        .label {
          color: var(--negative-saturated);
        }

        &.warn {
          color: inherit;
          box-shadow: inset 0 0 0 0.125rem var(--warning-saturated);

          .label {
            color: var(--warning-saturated);
          }
        }
      }

      &.disabled {
        pointer-events: none;
        background-color: transparent;
        border-style: dashed;
        border-color: var(--text-tertiary);
        color: var(--text-tertiary);
        box-shadow: none;

        &.dark {
          border-color: var(--text-tertiary-dark);
          color: var(--text-tertiary-dark);
        }

        .label {
          color: inherit;
        }

        .autogrow-area textarea::placeholder {
          color: inherit;
        }
      }

      &:focus-within {
        box-shadow: inset 0 0 0 2px var(--accent);
      }

      &:focus-within,
      &.dirty {
        .label {
          transform: translate(calc(-1rem + var(--radius-m)), calc(-100% - 1.25rem)) scale(0.75);
          width: calc(125% + 1rem - (2 * var(--radius-m)));
        }

        &.rich .label {
          transform: translate(calc(-1rem + var(--radius-m)), calc(-6.5rem)) scale(0.75);
        }
      }

      .label {
        display: block;
        cursor: text;
        user-select: none;
        color: var(--text-secondary);
        transform-origin: bottom left;
        position: absolute;
        white-space: nowrap;
        width: calc(100% - 2rem);
        overflow: hidden;
        text-overflow: ellipsis;
        transition: transform 200ms ease;

        &.right {
          text-align: right;
        }
      }

      .dropcursor {
        background-color: var(--accent) !important; // to override the style-attribute
        border-radius: 1px;
      }

      .editor-wrapper.ProseMirror  { // adapted from prosemirror-view/style/prosemirror.css
        position: relative;
        word-wrap: break-word;
        white-space: pre-wrap;
        white-space: break-spaces;
        // font-variant-ligatures: none // ligatures were disabled because Chrome couldn’t select inbetween them, but it seems fixed now
        // font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
        caret-color: transparent;
        user-select: auto;

        &.ProseMirror-focused {
          .ProseMirror-gapcursor {
            display: block;
          }
        }

        &.ProseMirror-hideselection {
          caret-color: transparent;

          *::selection {
            background-color: transparent;
          }
        }

        > :first-child,
        > :first-child :first-child {
          margin-top: 0;
        }

        > :last-child,
        > :last-child > :last-child {
          margin-bottom: 0;
        }

        .ProseMirror-gapcursor  { // adapted from prosemirror-gapcursor/style/gapcursor.css
          display: none;
          pointer-events: none;
          position: absolute;

          &::after {
            content: "";
            display: block;
            position: absolute;
            top: -0.125rem;
            width: 1.5rem;
            height: 0.125rem;
            background-color: var(--accent);
            border-radius: rem(1);
            animation: blink 1s ease infinite;
          }
        }

        pre {
          white-space: pre-wrap;

          code {
            background-color: transparent;
          }
        }

        hr {
          cursor: pointer;
          background-color: var(--accent-secondary);
          width: 30%;
        }

        code {
          background-color: var(--bg);
        }

        li {
          position: relative;

          &.ProseMirror-selectednode {
            outline: none;

            &::after {
              content: '';
              position: absolute;
              left: rem(-32);
              right: rem(-2);
              top: rem(-2);
              bottom: rem(-2);
              border: rem(2) solid var(--accent);
              pointer-events: none;
            }
          }
        }

        figure {
          margin: rem(32) 0;
          text-align: center;
          cursor: pointer;
          transition: background-color 350ms ease;

          &.loading {
            padding-top: calc(9 / 16 * 100%);
            background-color: var(--bg-tertiary);

            img {
              opacity: 0;
              height: 0;
              transition: none;
            }
          }

          img {
            display: block;
            margin: 0 auto;
            max-width: 100%;
            transition: opacity 350ms ease;
          }

          figcaption {
            position: relative;
            cursor: text;
            margin-top: 1rem;

            &.empty::before {
              content: 'Add caption…';
              color: var(--text-secondary);
              position: absolute;
              width: 100%;
              left: 0;
              top: 0;
            }
          }
        }

        .ProseMirror-selectednode {
          outline: 0.125rem solid var(--accent);
          outline-offset: 0.25rem;

          &::selection,
          ::selection {
            color: inherit;
          }
        }
      }

      .editor-wrapper.ProseMirror-hideselection + .fake-caret {
        display: none;
      }

      .placeholder {
        color: var(--text-secondary);
        pointer-events: none;
        margin: 0;
        position: absolute;
        top: 1rem;
        left: 1rem;

        &.h1, &.h2, &.h3, &.h4, &.h5, &.h6 {
          font-weight: bold;
        }

        &.code,
        &.code-lang {
          font-family: monospace;
          color: var(--text-secondary-dark);
          top: 2rem;
          left: 2rem;
        }

        &.code-lang {
          top: 3rem;
        }
      }

      .fake-caret {
        width: 0.125rem;
        min-height: 1em;
        border-radius: rem(1);
        background-color: var(--accent);
        position: absolute;
        top: 1rem;
        left: 1rem;
        margin: 0;
        pointer-events: none;
        transition: transform 100ms ease-out;
        animation: blink 1s ease infinite;

        &.code,
        &.code-lang {
          background-color: var(--text-dark);
        }

        @keyframes blink {
          0% {
            opacity: 0;
          }

          50% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }
      }

      .autogrow-area {
        position: relative;
        width: 100%;

        pre,
        textarea {
          vertical-align: top;
          margin: 0;
          padding: 0;
          outline: 0;
          border: 0;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          letter-spacing: inherit;
          color: inherit;
          background-color: transparent;
          resize: none;
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: inherit;
          overflow: hidden;
          text-align: inherit;
        }

        textarea {
          width: 100%;
          height: 100%;
          resize: none;
          caret-color: var(--accent);

          &::placeholder {
            color: var(--text-secondary);
            opacity: 1;
            user-select: none;
          }
        }

        pre {
          position: absolute;
          top: 0px;
          left: 0px;
          right: 0px;
          visibility: hidden;
        }
      }
    }
  }

  .popover {
    &.add-link,
    &.edit-image {
      h3 {
        text-align: center;
      }

      .input {
        width: 100%;
        display: flex;

        &.dark {
          background-color: var(--bg-tertiary-dark);
        }

        & + .remove-link {
          margin-top: 1.5rem;
        }
      }

      .input,
      .internal-link {
        &.v-enter-active,
        &.v-leave-active {
          transition: opacity 200ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
          }
        }
      }

      .internal-link {
        margin-top: 1.5rem;
        max-width: rem(309);

        &.dark {
          background-color: var(--bg-secondary-dark);

          .url,
          .collections ul li:not(:last-child) {
            background-color: var(--bg-tertiary-dark);

            &:hover {
              background-color: var(--bg-tertiary-dark-lightened-5);
            }
          }

          .view.files {
            .file-list {
              .files {
                background-color: var(--bg-secondary-dark);

                .file {
                  background-color: var(--bg-tertiary-dark);

                  &:hover {
                    background-color: var(--bg-tertiary-dark-lightened-5);
                  }

                  &:active {
                    background-color: var(--bg-secondary-dark);
                  }
                }
              }
            }
          }
        }

        .view.files {
          .file-list {
            header {
              .actions {
                flex-direction: column-reverse;
                align-items: flex-start;

                .input {
                  width: 100%;
                  margin-right: 0;
                  margin-top: 0.5rem;
                }

                > .button {
                  width: 100%;
                  margin: 0;
                }
              }
            }

            .files {
              max-height: rem(400);
              overflow-y: auto;
            }
          }
        }
      }

      .segmented-selector.dark {
        background-color: var(--bg-tertiary-dark);
      }

      .toggle {
        margin-top: 1rem;
      }

      .remove-link,
      .replace-image {
        margin-top: 1rem;
        width: 100%;
      }
    }

    &.edit-image {
      min-width: rem(320);

      @media #{$mobile} {
        min-width: auto;
      }

      .fields-editor {
        margin-bottom: 0.5rem;

        > .field.text:not(.localised):first-child {
          margin-top: 0.5rem;
        }

        > .field:not(:last-child) {
          margin-bottom: 1.5rem;
        }
      }
    }
  }
</style>
