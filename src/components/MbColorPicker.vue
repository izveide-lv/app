<template>
  <button class="color-picker" :class="{ dark, 'no-label': hideLabel }" @click="activate">
    <div class="color-swatch" :class="{ 'no-label': hideLabel }">
      <div v-show="Boolean(modelValue)" class="old-color" :style="{ backgroundImage: `linear-gradient(to right, ${currentColorNoAlpha} 50%, ${modelValue} 50%)` }" />
      <transition @after-leave="updateModel">
        <div v-show="popover.show && newColor && newColor !== modelValue" class="new-color" :class="{ cancelled: newColor === modelValue || (removable && !modelValue && workingColor.a === 0) }">
          <div v-show="colorCache || !removable || workingColor.a !== 0" class="color" :style="{ backgroundImage: `linear-gradient(to right, ${colorCache ? colorCache.colorNoAlpha : newColorNoAlpha} 50%, ${colorCache ? colorCache.color : newColor} 50%)` }" />
        </div>
      </transition>
    </div>
    <span v-if="!hideLabel">{{label}}</span>
    <MbPopover center-x class="color-popover" :dark="dark" no-content-padding ref="popover" :style="{ minWidth: `${popover.minWidth}px`}" :visible="popover.show" :x="popover.x" :y="popover.y" @close="deactivate" @focusout="handleFocusout" @keydown.arrow-down.arrow-up.prevent @keyup.arrow-down="focus(1)" @keyup.arrow-up="focus(-1)">
      <div v-if="!paletteOnly" class="padder" :class="[format, {removable}]">
        <div class="saturation-picker" ref="saturationPicker" :style="{backgroundColor: saturationPickerBG}" @pointerdown="activateSaturationPicker" @touchstart.stop>
          <div class="saturation" />
          <div class="picker" :style="{top: saturationTop, left: saturationLeft}" />
        </div>
        <div class="hue-picker" ref="huePicker" @pointerdown="activateHuePicker" @touchstart.stop>
          <div class="hue" />
          <div class="picker" :style="{left: hueLeft}" />
        </div>
        <div v-if="format === 'rgba'" class="alpha-picker" ref="alphaPicker" @pointerdown="activateAlphaPicker" @touchstart.stop>
          <div class="alpha" :style="{ backgroundImage: `linear-gradient(to right, transparent, ${newColorNoAlpha})` }"/>
          <div class="picker" :style="{left: alphaLeft}" />
        </div>
        <div class="color-info">
          <div class="color-swatch">
            <div v-show="colorCache || !removable || workingColor.a !== 0" class="color" :style="{ backgroundImage: `linear-gradient(45deg, ${colorCache ? colorCache.colorNoAlpha : newColorNoAlpha} 50%, ${colorCache ? colorCache.color : newColor} 50%)` }" />
          </div>
          <MbInput v-model="colorInput" :dark="dark" :error="colorError" icon="hash" placeholder="Color" ref="colorInput" @blur="handleColorInput" @focus="selectContent" @keyup.enter="handleColorInput" />
          <MbButton v-if="removable" :dark="dark" icon="cross" rounded :tooltip="{ message: 'Clear Color', position: 'right' }" @click="clearColor" />
        </div>
        <MbScroller v-if="palette && cleanPalette.length > 0">
          <div class="swatches">
            <div v-for="(color, index) in cleanPalette" class="color-swatch" :key="index" @click="selectColor(color.value)" @mouseenter="$store.commit('setTooltip', { message: color.label, target: $event.currentTarget })">
              <div class="color" :style="{ backgroundImage: `linear-gradient(45deg, ${color.valueNoAlpha} 50%, ${color.value} 50%)` }" />
            </div>
          </div>
        </MbScroller>
      </div>
      <ul v-else class="palette-list" ref="palette" tabindex="-1">
        <li v-for="(color, index) in filteredPalette" :class="{ active: color.value === modelValue, dark }" :key="index" tabindex="0" @click="selectColor(color.value)" @keyup.enter.space="selectColor(color.value)" @mouseenter="handleMouseenter($event, index)" @mouseleave="handleMouseleave">
          <div class="color-swatch">
            <div class="color" :style="{ backgroundImage: `linear-gradient(45deg, ${color.valueNoAlpha} 50%, ${color.value} 50%)` }" />
          </div>
          <span>{{color.label}}</span>
        </li>
      </ul>
      <template v-if="!paletteOnly" #footer>
        <MbButton :dark="dark" @click="deactivate(false)">Cancel</MbButton>
        <MbButton :dark="dark" type="primary" @click="deactivate(true)">Set Color</MbButton>
      </template>
      <template v-else #header>
        <MbInput v-model="filter" class="palette-filter" :dark="dark" icon="search" placeholder="Filter Colors" />
      </template>
    </MbPopover>
  </button>
</template>

<script>
import { throttle } from 'lodash-es';
import tinycolor from 'tinycolor2';

export default {
  beforeUnmount() {
    window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
  },
  computed: {
    alphaLeft() {
      return `${this.workingColor.a * 100}%`;
    },
    cleanPalette() {
      if (!this.palette) return [];
      const cleanPalette = this.palette.map((color) => {
        let value;
        const valueNoAlpha = tinycolor(color.value || color).toHexString();
        if (this.format === 'hex') value = valueNoAlpha;
        if (this.format === 'rgb') value = tinycolor(color.value || color).setAlpha(1).toRgbString();
        else value = tinycolor(color.value || color).toRgbString();

        if (typeof color === 'string') {
          return {
            label: value,
            value,
            valueNoAlpha,
          };
        }
        return {
          label: color.label || value,
          value,
          valueNoAlpha,
        };
      });

      if (this.paletteOnly && this.removable) cleanPalette.unshift({ label: 'No Color', value: '#ffffff00', valueNoAlpha: '#ffffff00' });
      return cleanPalette;
    },
    currentColorNoAlpha() {
      return tinycolor(this.modelValue).toHexString();
    },
    filteredPalette() {
      if (!this.filter) return this.cleanPalette;
      return this.cleanPalette.filter((color) => color.label.toLowerCase().includes(this.filter.toLowerCase()));
    },
    newColorNoAlpha() {
      return tinycolor(this.workingColor).toHexString();
    },
    hueLeft() {
      return `${(this.workingColor.h / 360) * 100}%`;
    },
    label() {
      if (this.cleanPalette.length > 0) {
        const color = this.cleanPalette.find((paletteItem) => paletteItem.value === this.modelValue);
        if (color) return color.label;
      }
      if (this.modelValue) {
        if (this.format === 'hex') return tinycolor(this.modelValue).toHexString();
        if (this.format === 'rgb') return tinycolor(this.modelValue).setAlpha(1).toRgbString();
        return tinycolor(this.modelValue).toRgbString();
      }
      return 'No Color';
    },
    newColor() {
      if (!this.workingColor) return null;
      if (this.format === 'hex') return tinycolor(this.workingColor).toHexString();
      if (this.format === 'rgb') return tinycolor(this.workingColor).setAlpha(1).toRgbString();
      return tinycolor(this.workingColor).toRgbString();
    },
    saturationLeft() {
      return `${this.workingColor.s * 100}%`;
    },
    saturationPickerBG() {
      return `hsl(${this.workingColor.h}, 100%, 50%)`;
    },
    saturationTop() {
      return `${-this.workingColor.v * 100 + 100}%`;
    },
  },
  data() {
    return {
      colorCache: null,
      colorError: '',
      colorInput: this.modelValue,
      currentlySelected: -1,
      filter: '',
      popover: {
        minWidth: 0,
        show: false,
        x: 0,
        y: 0,
      },
      workingColor: tinycolor(this.modelValue).toHsv(),
    };
  },
  methods: {
    activate() {
      if (this.popover.show) return;
      const rect = this.$el.getBoundingClientRect();
      const remBase = Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10);
      if (this.paletteOnly && this.filter) this.filter = '';
      if (this.colorCache) this.colorCache = null;
      this.popover.x = rect.left + rect.width / 2;
      this.popover.y = rect.bottom + 0.5 * remBase;
      this.popover.minWidth = Math.min(rect.width, window.innerWidth - remBase);
      window.addEventListener('scroll', this.deactivate, { capture: true, passive: true });

      this.workingColor = tinycolor(this.modelValue).toHsv(); // don’t update using the watcher but upon activation to avoid issues with the hue on desaturated colors

      this.popover.show = true;
    },
    activateHuePicker() {
      window.addEventListener('pointermove', this.handleHueInput, { passive: true });
      window.addEventListener('pointerup', this.deactivateHuePicker);
      window.addEventListener('click', this.preventPopoverClose, { capture: true });
      window.addEventListener('touchend', this.preventPopoverClose, { capture: true }); // needed because on touchscreens it doesn’t actually fire a click event on window when the touch is released
    },
    activateAlphaPicker() {
      window.addEventListener('pointermove', this.handleAlphaInput, { passive: true });
      window.addEventListener('pointerup', this.deactivateAlphaPicker);
      window.addEventListener('click', this.preventPopoverClose, { capture: true });
      window.addEventListener('touchend', this.preventPopoverClose, { capture: true }); // needed because on touchscreens it doesn’t actually fire a click event on window when the touch is released
    },
    activateSaturationPicker() {
      window.addEventListener('pointermove', this.handleSaturationInput, { passive: true });
      window.addEventListener('pointerup', this.deactivateSaturationPicker);
      window.addEventListener('click', this.preventPopoverClose, { capture: true });
      window.addEventListener('touchend', this.preventPopoverClose, { capture: true }); // needed because on touchscreens it doesn’t actually fire a click event on window when the touch is released
    },
    clamp(value, min, max) {
      if (min < max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
      }
      if (value < max) return max;
      if (value > min) return min;
      return value;
    },
    clearColor() {
      this.workingColor = { h: 0, s: 0, v: 0, a: 0 }; // eslint-disable-line object-curly-newline
      this.$nextTick(() => { this.colorInput = ''; }); // wait a tick so it doesn’t get overwritten by the watcher
    },
    deactivate(confirm) { // confirm may also be the scroll event
      if (typeof confirm === 'object' && confirm.type === 'scroll' && this.$refs.popover.$refs.el.contains(confirm.target)) return;
      window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
      this.popover.show = false;
      if (confirm !== true) {
        this.colorCache = {
          color: this.newColor,
          colorNoAlpha: this.newColorNoAlpha,
        };
        this.workingColor = this.modelValue ? tinycolor(this.modelValue).toHsv() : { h: 0, s: 0, v: 0, a: 0 }; // eslint-disable-line object-curly-newline
      }
      this.$el.focus();
    },
    deactivateAlphaPicker(e) {
      this.handleAlphaInput(e);
      window.removeEventListener('pointermove', this.handleAlphaInput);
      window.removeEventListener('pointerup', this.deactivateAlphaPicker);
    },
    deactivateHuePicker(e) {
      this.handleHueInput(e);
      window.removeEventListener('pointermove', this.handleHueInput);
      window.removeEventListener('pointerup', this.deactivateHuePicker);
    },
    deactivateSaturationPicker(e) {
      this.handleSaturationInput(e);
      window.removeEventListener('pointermove', this.handleSaturationInput);
      window.removeEventListener('pointerup', this.deactivateSaturationPicker);
    },
    focus(direction) {
      if (!this.paletteOnly) return;
      const elements = this.$refs.palette.querySelectorAll('li');
      if (elements.length === 0) return;

      if (direction < 0) { // focus previous
        if (this.currentlySelected > 0) this.currentlySelected -= 1;
        else this.currentlySelected = elements.length - 1;
      } else { // focus next
        // eslint-disable-next-line no-lonely-if
        if (this.currentlySelected < elements.length - 1) this.currentlySelected += 1;
        else this.currentlySelected = 0;
      }

      elements[this.currentlySelected].focus();
    },
    handleAlphaInput: throttle(function (e) { // eslint-disable-line func-names
      const container = this.$refs.alphaPicker;
      const containerRect = container.getBoundingClientRect();

      const left = this.clamp(e.clientX - containerRect.left, 0, containerRect.width);
      const a = this.clamp(left / containerRect.width, 0, 1);
      this.workingColor.a = a;
    }, 20),
    handleColorInput() {
      const color = tinycolor(this.colorInput);
      this.colorError = '';

      if (color.isValid()) this.workingColor = color.toHsv();
      else this.colorError = 'Invalid Color';
    },
    handleFocusout(e) {
      if (e.relatedTarget !== this.$el && !this.$refs.popover.$refs.el.contains(e.relatedTarget)) this.deactivate();
    },
    handleHueInput: throttle(function (e) { // eslint-disable-line func-names
      const container = this.$refs.huePicker;
      const containerRect = container.getBoundingClientRect();

      const left = this.clamp(e.clientX - containerRect.left, 0, containerRect.width);
      const h = 360 * this.clamp(left / containerRect.width, 0, 360);
      this.workingColor.h = h;
      if (this.removable && this.workingColor.a === 0) this.workingColor.a = 1; // the color was removed and we have to add it back
    }, 20),
    handleMouseenter(e, index) {
      if (!this.paletteOnly) return;
      if (this.popover.show) {
        if (this.$refs.palette.contains(document.activeElement)) this.$refs.palette.focus();
        this.currentlySelected = index;
      }
    },
    handleMouseleave() {
      if (!this.paletteOnly) return;
      if (this.popover.show) {
        this.currentlySelected = -1;
      }
    },
    handleSaturationInput: throttle(function (e) { // eslint-disable-line func-names
      const container = this.$refs.saturationPicker;
      const containerRect = container.getBoundingClientRect();

      const left = this.clamp(e.clientX - containerRect.left, 0, containerRect.width);
      const top = this.clamp(e.clientY - containerRect.top, 0, containerRect.height);

      const s = left / containerRect.width;
      const v = this.clamp(-(top / containerRect.height) + 1, 0, 1);

      this.workingColor.s = s;
      this.workingColor.v = v;
      if (this.removable && this.workingColor.a === 0) this.workingColor.a = 1; // the color was removed and we have to add it back
    }, 20),
    preventPopoverClose(e) {
      e.stopPropagation();
      window.removeEventListener('click', this.preventPopoverClose, { capture: true });
      window.removeEventListener('touchend', this.preventPopoverClose, { capture: true });
    },
    selectColor(color) {
      this.workingColor = tinycolor(color).toHsv();
      if (!this.paletteOnly) return; // don’t deactivate if it’s not paletteOnly
      this.$nextTick(() => { // wait a tick so updateModel can fire
        this.deactivate(true);
      });
    },
    selectContent() {
      this.$refs.colorInput.$refs.input.select();
    },
    updateModel() {
      if (this.removable && this.workingColor.a === 0) this.$emit('update:modelValue', null);
      else this.$emit('update:modelValue', this.newColor); // newColor already has the appropriate format
      this.colorCache = null;
    },
  },
  props: {
    dark: Boolean,
    format: {
      type: String,
      default: 'hex',
      validator: (v) => ['hex', 'rgb', 'rgba'].includes(v),
    },
    hideLabel: Boolean,
    modelValue: String,
    palette: Array,
    paletteOnly: Boolean,
    removable: Boolean,
  },
  watch: {
    newColor(nv) {
      if (this.colorError) this.colorError = '';
      this.colorInput = nv;
    },
  },
};
</script>

<style lang="scss" scoped>
  @mixin checkerboardBG($color, $size: 1rem) {
    background-image: linear-gradient(to right, $color, $color), linear-gradient(to right, black 50%, white 50%), linear-gradient(to bottom, black 50%, white 50%);
    background-size: $size $size;
    background-blend-mode: normal, difference;
  }

  .color-picker {
    position: relative;
    border: none;
    background-color: var(--bg-secondary);
    color: inherit;
    border-radius: var(--radius-m);
    padding: 0.5rem;
    padding-right: 1.5rem;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    transition: background-color 200ms ease;
    user-select: none;
    text-align: left;
    white-space: nowrap;
    max-width: 100%;

    &.no-label {
      padding-right: 0.5rem;
    }

    &:hover {
      background-color: var(--bg-tertiary);
    }

    &:focus {
      background-color: var(--bg-secondary);

      &::before {
        opacity: 1;
      }
    }

    &:active {
      transform: translateY(2px);
    }

    &.dark {
      background-color: var(--bg-secondary-dark);

      &:hover {
        background-color: var(--bg-tertiary-dark);
      }

      &:focus {
        background-color: var(--bg-secondary-dark);
      }
    }

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 0.125rem solid var(--accent);
      opacity: 0;
      border-radius: inherit;
      transition: opacity 200ms ease;
    }

    .color-swatch {
      border-radius: var(--radius-s);
      width: 2.625rem;
      height: 2.625rem;
      margin-right: 1rem;
      @include checkerboardBG(color-mix(in srgb, white 75%, transparent), 1.3125rem);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      padding: 0.0625rem;
      background-clip: content-box;

      &.no-label {
        margin-right: 0;
      }

      .old-color,
      .new-color {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      .new-color {
        top: auto;
        bottom: 0;
        @include checkerboardBG(color-mix(in srgb, white 75%, transparent), 50%);
        transform: translateY(50%);
        padding: 0 0.0625rem;
        background-clip: content-box;

        &.v-enter-active,
        &.v-leave-active {
          transition: transform 150ms ease;

          &.v-enter-from {
            transform: translateY(100%);
          }

          &.v-leave-to {
            transform: translateY(0);

            &.cancelled {
              transform: translateY(100%);
            }
          }
        }

        .color {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      }
    }

    span {
      overflow: hidden;
      width: 100%;
      text-overflow: ellipsis;
    }
  }

  .color-popover {
    .padder {
      padding: 0.5rem;
      max-width: 17rem;

      &.rgb {
        &.removable {
          max-width: 19rem;
        }
      }

      &.rgba {
        max-width: 20rem;

        &.removable {
          max-width: 22rem;
        }
      }

      .saturation-picker {
        position: relative;
        height: 8rem;
        margin-bottom: 0.5rem;
        border-radius: var(--radius-m);
        touch-action: none;

        .saturation {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: var(--radius-m);
          pointer-events: none;
        }

        .saturation {
          background-image: linear-gradient(to top, #000, rgba(0, 0, 0, 0)), linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
        }
      }

      .hue-picker,
      .alpha-picker {
        position: relative;
        height: 1.5rem;
        margin-bottom: 0.5rem;
        touch-action: none;

        .hue,
        .alpha {
          height: 100%;
          border-radius: var(--radius-m);
          background-image: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
          pointer-events: none;
        }
      }

      .alpha-picker {
        @include checkerboardBG(color-mix(in srgb, white 75%, transparent), 0.75rem);
        border-radius: var(--radius-m);
        padding: 0.0625rem;
        background-clip: content-box;

        .alpha {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
        }
      }

      .picker {
        border: 0.125rem solid white;
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 0.5rem;
        position: absolute;
        left: 0;
        top: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 0 0.0625rem color-mix(in srgb, black 50%, transparent);
      }

      .color-info {
        display: flex;
        align-items: center;

        .color-swatch {
          width: rem(40); // height of the smaller input minus shadow
          height: rem(40);
          margin-right: 0.5rem;
        }

        .input {
          flex-shrink: 1;
          padding: 0.5rem;
          margin-top: 0;
          transition: margin 150ms ease;
          width: 100%;

          &.dark {
            background-color: var(--bg-tertiary-dark);
          }

          &.error {
            margin-top: 1rem;

            &:deep(span) {
              transform: translate(calc(-3rem + var(--radius-m)), calc(-100% - 0.5rem)) scale(0.75);
            }
          }
        }

        .button {
          margin-left: 0.5rem;
          flex-shrink: 0;
        }
      }

      .scroller {
        margin-top: 0.5rem;
        width: 100%;

        .swatches {
          display: flex;
          padding: 0.5rem;

          &::after {
            content: '';
            display: block;
            width: 0.5rem;
            flex-shrink: 0;
          }

          .color-swatch:last-child {
            margin-right: 0;
          }
        }
      }
    }

    .palette-list {
      list-style: none;
      padding: 0.5rem;
      margin: 0;

      li {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        border-radius: var(--radius-m);
        transition: background-color 200ms ease;

        &:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        &.active {
          background-color: var(--accent);
          color: var(--text-dark);
        }

        &.dark {
          &:hover,
          &:focus {
            background-color: var(--bg-tertiary-dark);
          }
        }

        &:hover,
        &:focus {
          background-color: var(--bg-secondary);

          &.active {
            background-color: var(--accent-darkened-5);
          }
        }
      }
    }

    .color-swatch {
      box-shadow: 0 0 0 0.0625rem var(--text-secondary);
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      margin-right: 0.75rem;
      overflow: hidden;
      @include checkerboardBG(color-mix(in srgb, white 75%, transparent), 0.75rem);
      padding: 0.0625rem;
      background-clip: content-box;
      position: relative;

      .color {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    }

    .palette-filter {
      margin: 0.5rem;
      margin-bottom: 0;
      width: calc(100% - 1rem);
      padding: 0.75rem;

      &.dark {
        background-color: var(--bg-tertiary-dark);
      }
    }
  }
</style>
