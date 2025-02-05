<template>
  <div class="date-picker" :class="{dark}" tabindex="0" @click="activate" @keydown.space.prevent @keyup.space.enter="activate">
    <span v-if="label" class="floating-label">{{label}}</span>
    <MbIcon :icon="modelValue ? 'calendar' : 'calendar-add'" />
    <span class="label" :class="{ placeholder: !formattedDate }">{{formattedDate || placeholder}}</span>
    <MbIcon v-if="showTime" v-show="modelValue" class="clock" icon="clock" />
    <span v-if="showTime" v-show="modelValue" class="label">{{formattedTime}}</span>
    <MbButton v-if="removable" v-show="modelValue" :dark="dark" icon="cross" ref="removeButton" rounded tooltip="Clear date" @click="$emit('update:modelValue', null)" />
    <MbPopover center-x class="date-popover" :dark="dark" ref="popover" :visible="popover.show" :x="popover.x" :y="popover.y" @close="deactivate">
      <header>
        <MbButton v-show="!mobile" :dark="dark" icon="chevron-left" rounded tooltip="Previous month" @click="changeMonth(-1)" />
        <MbSelect v-model="currentMonth" class="month-picker" :dark="dark" :options="months" ref="monthSelector" @click="monthSelectorOpen = true" />
        <MbButton v-show="!mobile" :dark="dark" icon="chevron-right" rounded tooltip="Next month" @click="changeMonth(1)" />
      </header>
      <div class="calendar" @touchend="handleTouchEnd" @touchstart="handleTouchStart">
        <header>
          <span class="label">Mon</span>
          <span class="label">Tue</span>
          <span class="label">Wed</span>
          <span class="label">Thu</span>
          <span class="label">Fri</span>
          <span class="label">Sat</span>
          <span class="label">Sun</span>
        </header>
        <transition mode="out-in" :name="calendarTransition">
          <div class="days" :key="currentMonth">
            <MbButton v-for="(day, index) in days" :class="{ 'other-month': day.month !== currentMonth }" :dark="dark" :disabled="day.disabled" :key="index" rounded :type="day.active ? 'primary' : null" @click="setDay(day.day, day.month, day.year)">{{day.day}}</MbButton>
          </div>
        </transition>
      </div>
      <footer v-if="showTime">
        <MbButton :dark="dark" icon="minus" rounded tooltip="Remove 15 minutes" @click="changeTime(-15)" />
        <MbInput :dark="dark" icon="clock" :error="timeError" :model-value="formattedLocalTime" placeholder="00:00" @blur="changeTime(tempTime)" @keyup.enter="changeTime(tempTime)" @update:model-value="tempTime = $event" />
        <MbButton :dark="dark" icon="plus" rounded tooltip="Add 15 minutes" @click="changeTime(15)" />
      </footer>
      <template #footer>
        <MbButton :dark="dark" @click="deactivate">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="(minDate && date < minDate) || (maxDate && date > maxDate)" type="primary" @click="setDate">Set Date</MbButton>
      </template>
    </MbPopover>
  </div>
</template>

<script>
import {
  addDays,
  addMinutes,
  addMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  formatISO,
  getDate,
  getHours,
  getMinutes,
  getMonth,
  getYear,
  isSameDay,
  parseISO,
  roundToNearestMinutes,
  setDate,
  setHours,
  setMinutes,
  setMonth,
  setYear,
  startOfDay,
  startOfMinute,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

export default {
  beforeUnmount() {
    window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
  },
  computed: {
    currentMonth: {
      get() {
        return getMonth(this.date);
      },
      set(v) {
        this.date = setMonth(this.date, v);
      },
    },
    currentYear() {
      return getYear(this.date);
    },
    days() {
      const start = startOfWeek(startOfMonth(this.date), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(this.date), { weekStartsOn: 1 });
      const rawDays = eachDayOfInterval({ start, end });
      const cleanDays = [];
      rawDays.forEach((day) => {
        cleanDays.push({
          active: isSameDay(this.date, day),
          day: getDate(day),
          disabled: (this.minDate && day < this.minDate) || (this.maxDate && day >= this.maxDate),
          month: getMonth(day),
          year: getYear(day),
        });
      });
      return cleanDays;
    },
    formattedDate() {
      if (!this.modelValue) return null;
      let dateFormat = 'dd MMMM yyyy';
      if (this.showTime) {
        if (this.mobile) dateFormat = 'dd/MM/yy';
        else dateFormat = 'dd MMM. yyyy';
      } else if (this.mobile) dateFormat = 'dd MMM. yyyy';
      if (typeof this.modelValue === 'string') return format(parseISO(this.modelValue), dateFormat);
      return format(this.modelValue, dateFormat);
    },
    formattedLocalTime() {
      return format(this.date, 'HH:mm');
    },
    formattedTime() {
      if (!this.modelValue) return null;
      const dateFormat = 'HH:mm';
      if (typeof this.modelValue === 'string') return format(parseISO(this.modelValue), dateFormat);
      return format(this.modelValue, dateFormat);
    },
    maxDate() {
      if (this.only === 'past') return endOfDay(addDays(new Date(), -1));
      if (!this.max) return null;
      if (typeof this.max === 'string') return startOfDay(addDays(parseISO(this.max), 1));
      return startOfDay(addDays(new Date(this.max), 1));
    },
    minDate() {
      if (this.only === 'future') return startOfDay(addDays(new Date(), 1));
      if (!this.min) return null;
      if (typeof this.min === 'string') return endOfDay(addDays(parseISO(this.min), -1));
      return endOfDay(addDays(new Date(this.min), -1));
    },
    mobile() {
      return this.$store.state.application.mobile;
    },
    months() {
      return eachMonthOfInterval({ start: startOfYear(this.date), end: endOfYear(this.date) })
        .map((month, index) => ({
          label: format(month, 'MMMM yyyy'),
          value: index,
        }));
    },
  },
  created() {
    if (this.modelValue) this.date = new Date(this.modelValue);
    else this.date = new Date();
  },
  data() {
    return {
      calendarTransition: 'forward',
      date: null,
      monthSelectorOpen: false,
      popover: {
        show: false,
        x: 0,
        y: 0,
      },
      tempTime: '',
      timeError: '',
      touchStart: 0,
    };
  },
  emits: ['update:modelValue'],
  methods: {
    activate(e) {
      if (this.popover.show) return;
      if (this.removable && (e.target === this.$refs.removeButton.$el || this.$refs.removeButton.$el.contains(e.target))) return;
      const rect = this.$el.getBoundingClientRect();
      const remBase = Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10);
      this.popover.x = rect.left + rect.width / 2;
      this.popover.y = rect.bottom + 0.5 * remBase;
      window.addEventListener('scroll', this.deactivate, { capture: true, passive: true });

      this.popover.show = true;
    },
    changeMonth(amount) {
      this.date = addMonths(this.date, amount);
    },
    changeTime(value) {
      if (this.timeError) this.timeError = '';
      if (typeof value === 'string') {
        if (value === '') {
          const now = new Date();
          const minutes = getMinutes(now);
          const hours = getHours(now);
          this.date = startOfMinute(setHours(setMinutes(this.date, minutes), hours));
          return;
        }
        const [hourString, minuteString] = value.split(':');
        const parsedHours = Number.parseInt(hourString, 10);
        let parsedMinutes = Number.parseInt(minuteString, 10);

        if (Number.isNaN(parsedHours)) {
          this.timeError = 'Invalid time';
          return;
        }

        if (Number.isNaN(parsedMinutes)) parsedMinutes = 0;

        const hours = Math.max(Math.min(parsedHours, 23), 0);
        const minutes = Math.max(Math.min(parsedMinutes, 59), 0);

        this.date = startOfMinute(setHours(setMinutes(this.date, minutes), hours));
      } else if (value) {
        this.date = roundToNearestMinutes(addMinutes(this.date, value), { nearestTo: 15 });
      } else this.timeError = 'Invalid time';
    },
    deactivate(e) {
      if (this.monthSelectorOpen) {
        this.monthSelectorOpen = false;
        return;
      }
      if (e && e.type === 'scroll' && (this.$refs.popover.$refs.el.contains(e.target) || this.$refs.monthSelector.$refs.popover.$refs.el.contains(e.target))) return;
      window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
      this.popover.show = false;
      this.$el.focus();
    },
    handleTouchEnd(e) {
      const delta = this.touchStart - e.changedTouches[0].clientX;
      const threshold = 150;

      if (delta > threshold) this.changeMonth(1);
      if (delta < -threshold) this.changeMonth(-1);
    },
    handleTouchStart(e) {
      this.touchStart = e.changedTouches[0].clientX;
    },
    setDate() {
      if (!this.showTime) this.date = startOfDay(this.date);
      if (this.format === 'ms') this.$emit('update:modelValue', this.date.valueOf());
      else if (this.format === 'iso' && this.showTime) this.$emit('update:modelValue', formatISO(this.date));
      else this.$emit('update:modelValue', formatISO(this.date, { representation: 'date' }));
      this.deactivate();
    },
    setDay(day, month, year) {
      let { date } = this;
      if (year !== this.currentYear) date = setYear(date, year);
      if (month !== this.currentMonth) date = setMonth(date, month);
      this.date = setDate(date, day);
    },
  },
  props: {
    dark: Boolean,
    format: {
      type: String,
      validator: (v) => ['ms', 'iso'].includes(v),
      default: 'ms',
    },
    label: String,
    max: [String, Number],
    min: [String, Number],
    modelValue: [String, Number],
    only: {
      type: String,
      validator: (v) => ['past', 'future'].includes(v),
    },
    placeholder: {
      type: String,
      default: 'Choose a date…',
    },
    removable: Boolean,
    showTime: Boolean,
  },
  watch: {
    currentMonth(nv, ov) {
      if (ov > nv) this.calendarTransition = 'forwards';
      else this.calendarTransition = 'backwards';
    },
    currentYear(nv, ov) { // hacky but ensures that the right animation plays if the year gets smaller
      if (ov > nv) this.calendarTransition = 'forwards';
      else this.calendarTransition = 'backwards';
    },
    modelValue(nv) {
      if (!nv) this.date = new Date();
      else this.date = new Date(this.modelValue);
    },
  },
};
</script>

<style lang="scss">
  .date-popover  { // needs to be unscoped for the select to pick up the styles
    .month-picker.select.button {
      border: none;
      min-width: auto;

      &:focus {
        border: none;
      }
    }
  }
</style>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .date-picker {
    position: relative;
    border: none;
    background-color: var(--bg-secondary);
    color: inherit;
    border-radius: var(--radius-m);
    padding: 1rem;
    padding-right: 1.5rem;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    transition: background-color 200ms ease;
    user-select: none;
    text-align: left;
    white-space: nowrap;
    max-width: 100%;

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

      .floating-label,
      .label.placeholder {
        color: var(--text-secondary-dark);
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
      border-radius: var(--radius-m);
      transition: opacity 200ms ease;
    }

    .floating-label {
      position: absolute;
      top: -1.25rem;
      left: var(--radius-m);
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .label {
      margin-left: 0.75rem;
      margin-right: auto;
      overflow: hidden;
      text-overflow: ellipsis;

      &.placeholder {
        color: var(--text-secondary);
      }
    }

    .icon {
      flex-shrink: 0;

      &.clock {
        margin-left: 1.5rem;

        @media #{$mobile} {
          margin-left: 1rem;
        }
      }
    }

    .button.icon {
      margin: -0.5rem;
      margin-left: 0.5rem;
      margin-right: -1rem;
      padding: rem(8.5);
    }
  }

  .date-popover {
    &.dark {
      .calendar {
        header {
          color: var(--text-secondary-dark);
        }

        .days {
          .button.other-month:not(.disabled) {
            color: var(--text-secondary-dark);
          }
        }
      }
    }

    * {
      user-select: none;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      @media #{$mobile} {
        justify-content: center;
      }

      .button {
        &:first-child {
          margin-right: 0.5rem;
        }

        &:last-child {
          margin-left: 0.5rem;
        }
      }
    }

    .calendar {
      margin: 0 auto;
      width: 100%;
      max-width: rem(7 * (40 + 6) - 6); // 7 Buttons a 48px + 6px margin - negative margin of 6px

      header {
        display: flex;
        justify-content: space-around;
        color: var(--text-secondary);
        margin-bottom: 0.75rem;

        .label {
          margin: 0 0.375rem;
          width: 100%;
          text-align: center;
          font-size: 0.75rem;

          &:first-child {
            margin-left: 0;
          }

          &:last-child {
            margin-right: 0;
          }
        }
      }

      .days {
        display: flex;
        flex-wrap: wrap;
        margin: 0 -0.1875rem;

        &.forwards-enter-active,
        &.backwards-enter-active,
        &.forwards-leave-active,
        &.backwards-leave-active {
          transition: transform 150ms ease-out, opacity 150ms ease-out;

          &.forwards-enter-from,
          &.backwards-leave-to {
            opacity: 0;
            transform: translateX(-2rem);
          }

          &.backwards-enter-from,
          &.forwards-leave-to {
            opacity: 0;
            transform: translateX(2rem);
          }
        }

        &.forwards-leave-active,
        &.backwards-leave-active {
          transition-timing-function: ease-in;
        }

        .button {
          margin: 0.1875rem;
          padding: 0;
          width: calc(100% / 7 - 0.375rem);
          height: rem(40);
          border: none;
          display: inline-block;

          &.other-month:not(.disabled) {
            color: var(--text-secondary);
          }
        }
      }
    }

    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1.5rem;

      &:last-child {
        margin-bottom: 0.5rem;
      }

      .button.icon {
        &:first-child {
          margin-right: 0.75rem;
        }

        &:last-child {
          margin-left: 0.75rem;
        }
      }

      .input {
        margin-top: 0;
        width: 8rem;
      }
    }
  }
</style>
