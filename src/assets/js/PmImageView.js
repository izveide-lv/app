import { NodeSelection } from 'prosemirror-state';

import { joinPath } from '../../fs';

import { loadImage } from '../../fs/workerFS';

export default class PmImageView {
  constructor(node, view, getPos, allowCaption, mediaSettings, projectPath, addToast) {
    this.addToast = addToast;
    this.allowCaption = allowCaption;
    this.currentSrc = node.attrs.src;
    this.mediaSettings = mediaSettings;
    this.projectPath = projectPath;

    const figure = document.createElement('figure');
    const img = document.createElement('img');

    let wrapper;
    if (allowCaption) {
      wrapper = document.createElement('div');
      wrapper.setAttribute('contentEditable', 'false');
    }

    Object.entries(node.attrs).forEach(([name, value]) => {
      if (name === 'src') {
        if (!value.startsWith('/')) {
          img.setAttribute(name, value);
          img.addEventListener('load', () => {
            figure.classList.remove('loading');
          }, { once: true });
        } else {
          this.fetchImage(this.normalisedSrc(value)).then((url) => {
            this.image = url;
            img.setAttribute(name, url);
            figure.classList.remove('loading');
          });
        }
      } else if (name === 'data' && value) {
        Object.entries(value).forEach(([dataName, dataValue]) => {
          // data-attributes in HTML must be all lowercase
          // accessing them via el.dataset returns them as camelCased though, so we convert them back here
          const cleanKey = dataName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
          img.setAttribute(`data-${cleanKey}`, String(dataValue));
        });
      } else if (value) img.setAttribute(name, value);
    });

    img.setAttribute('draggable', 'false');
    img.setAttribute('contentEditable', 'false');
    figure.classList.add('loading');

    if (wrapper) {
      wrapper.appendChild(img);
      figure.appendChild(wrapper);
    } else figure.appendChild(img);

    if (allowCaption) {
      const caption = document.createElement('figcaption');
      if (node.content.size === 0) caption.classList.add('empty');
      figure.appendChild(caption);
      this.contentDOM = caption;

      figure.addEventListener('click', (e) => {
        if (e.target !== caption && !caption.contains(e.target)) {
          const change = view.state.tr.setSelection(NodeSelection.create(view.state.doc, getPos()));
          view.dispatch(change);
        }
      });
    }

    this.dom = figure;
  }

  destroy() {
    if (this.image) {
      window.URL.revokeObjectURL(this.image);
      this.image = null;
    }
  }

  async fetchImage(path) {
    if (!path) return null;
    const realPath = path.startsWith(this.projectPath) ? path : joinPath(this.projectPath, path);
    try {
      const { url, raw } = await loadImage(realPath);
      this.dom.dispatchEvent(new CustomEvent('image-load', { detail: { image: raw, path }, bubbles: true, composed: true })); // Using a CustomEvent here so we get bubbling and can listen to it in Edit Content
      return url;
    } catch (err) {
      if (err.code === 'ENOENT') this.addToasts({ message: `The image for “${path}” could not be found. It may have been moved, renamed, or deleted and should be updated accordingly`, timeout: 10000, type: 'warning' });
      else this.addToasts({ message: `Something went wrong when fetching the image thumbnail for ${path}: ${err.message}`, type: 'error' });
      return null;
    }
  }

  ignoreMutation(mutation) { // needed to prevent an infinite loop when captions are enabled
    if (!this.contentDOM) return true;
    if (mutation.target === this.contentDOM) return false;
    return !this.contentDOM.contains(mutation.target);
  }

  normalisedSrc(src) {
    if (this.mediaSettings.outputPath && src && src.startsWith(this.mediaSettings.outputPath)) return src.replace(this.mediaSettings.outputPath, this.mediaSettings.dir);
    return src;
  }

  stopEvent(e) {
    if (this.allowCaption && e.type === 'click' && e.target !== this.dom.querySelector('figcaption') && !this.dom.querySelector('figcaption').contains(e.target)) return true;
    return false;
  }

  update(node) {
    if (node.type.name !== 'image') return false;

    if (this.allowCaption) {
      const caption = this.dom.querySelector('figcaption');

      if (node.content.size > 0) caption.classList.remove('empty');
      else caption.classList.add('empty');
    }

    Object.entries(node.attrs).forEach(([name, value]) => {
      const img = this.dom.querySelector('img');
      if (name === 'src') {
        if (value !== this.currentSrc) {
          this.currentSrc = value;
          this.dom.classList.add('loading');
          if (!value.startsWith('/')) {
            img.setAttribute(name, value);
            img.addEventListener('load', () => {
              this.dom.classList.remove('loading');
            }, { once: true });
          } else {
            this.fetchImage(this.normalisedSrc(value)).then((url) => {
              this.image = url;
              img.setAttribute(name, url);
              this.dom.classList.remove('loading');
            });
          }
        }
        // if it is not a new src, don’t do anything
      } else if (name === 'data' && value) {
        Object.entries(value).forEach(([dataName, dataValue]) => {
          // data-attributes in HTML must be all lowercase
          // accessing them via el.dataset returns them as camelCased though, so we convert them back here
          const cleanKey = dataName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
          if (typeof dataValue !== 'undefined' && dataValue !== null && dataValue !== '') img.setAttribute(`data-${cleanKey}`, String(dataValue));
          else img.removeAttribute(`data-${cleanKey}`);
        });
      } else if (typeof value !== 'undefined' && value !== null && value !== '') img.setAttribute(name, value);
      else img.removeAttribute(name);
    });

    return true;
  }
}
