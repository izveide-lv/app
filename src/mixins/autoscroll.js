/*
  This code was heavily inspired by this: https://www.bennadel.com/blog/3460-automatically-scroll-the-window-when-the-user-approaches-the-viewport-edge-in-javascript.htm
  The original idea and implementation are © Ben Nadel
  I’ve changed it to become a Vue mixin (which it sadly has to be because I have
  no other way of handling the reference to the current animation frame, which has
  to be on an outside scope so it can be cancelled by pointer move and up events)
  and implemented the motion using an animation frame instead of a timeout
*/

export default {
  data() {
    return {
      autoscrollAnimationFrame: null,
    };
  },
  methods: {
    // el is the element to be scrolled, rect is an object with top, left, width and height props representing the bounds of el, x and y are the cursor position in the viewport
    autoscroll(el, rect, x, y) {
      if (this.autoscrollAnimationFrame) {
        window.cancelAnimationFrame(this.autoscrollAnimationFrame);
        this.autoscrollAnimationFrame = null;
      }
      let lastFrame;
      const speed = 1000;
      const threshold = 50;
      const relativeX = x - rect.left;
      const relativeY = y - rect.top;

      const zoneTop = threshold;
      const zoneBottom = rect.height - threshold;
      const zoneLeft = threshold;
      const zoneRight = rect.width - threshold;

      const requestScrollLeft = relativeX < zoneLeft;
      const requestScrollRight = relativeX > zoneRight;
      const requestScrollUp = relativeY < zoneTop;
      const requestScrollDown = relativeY > zoneBottom;

      if (!requestScrollLeft && !requestScrollRight && !requestScrollUp && !requestScrollDown) {
        window.cancelAnimationFrame(this.autoscrollAnimationFrame);
        this.autoscrollAnimationFrame = null;
        return;
      }

      const maxScrollX = el.scrollWidth - rect.width;
      const maxScrollY = el.scrollHeight - rect.height;

      const scrollParent = (currentFrame) => {
        let delta = 0.016;

        if (lastFrame) delta = (currentFrame - lastFrame) / 1000; // how many seconds have passed between the last animation frame and this one (so it’s always the same speed, like in Game Engines)

        const currentScrollX = el.scrollLeft;
        const currentScrollY = el.scrollTop;

        const canScrollLeft = currentScrollX > 0;
        const canScrollRight = currentScrollX < maxScrollX;
        const canScrollUp = currentScrollY > 0;
        const canScrollDown = currentScrollY < maxScrollY;

        let nextScrollX = currentScrollX;
        let nextScrollY = currentScrollY;

        if (requestScrollLeft && canScrollLeft) {
          const speedFactor = Math.min((zoneLeft - relativeX) / threshold, 1);
          nextScrollX -= speed * speedFactor * delta;
        } else if (requestScrollRight && canScrollRight) {
          const speedFactor = Math.min((relativeX - zoneRight) / threshold, 1);
          nextScrollX += speed * speedFactor * delta;
        }

        if (requestScrollUp && canScrollUp) {
          const speedFactor = Math.min((zoneTop - relativeY) / threshold, 1);
          nextScrollY -= (speed * speedFactor) * delta;
        } else if (requestScrollDown && canScrollDown) {
          const speedFactor = Math.min((relativeY - zoneBottom) / threshold, 1);
          nextScrollY += (speed * speedFactor) * delta;
        }

        nextScrollX = Math.max(0, Math.min(nextScrollX, maxScrollX));
        nextScrollY = Math.max(0, Math.min(nextScrollY, maxScrollY));

        if (nextScrollX !== currentScrollX || nextScrollY !== currentScrollY) {
          el.scrollTo(nextScrollX, nextScrollY);
          lastFrame = currentFrame;
          this.autoscrollAnimationFrame = window.requestAnimationFrame(scrollParent);
        }
      };

      this.autoscrollAnimationFrame = window.requestAnimationFrame(scrollParent);
    },
  },
};
