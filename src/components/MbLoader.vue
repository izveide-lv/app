<template>
  <div class="loader">
    <div class="wall">
      <div class="brick full" />
      <div class="brick half" />
      <div class="brick half" />
      <div class="brick full" />
    </div>
  </div>
</template>

<script>
export default {
};
</script>

<style lang="scss" scoped>
  .loader {
    display: flex;
    align-items: center;
    justify-content: center;

    .wall {
      width: 2rem;
      height: 2rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      animation: turn 2500ms ease infinite;

      @keyframes turn {
        52.5%,
        80% {
          transform: none;
          opacity: 1;
        }

        90%,
        100% {
          transform: translateY(0.5rem);
          opacity: 0;
        }
      }

      .brick {
        height: 25%;
        width: 100%;
        box-shadow: inset 0 0 0 rem(1) currentColor, 0 0 0 rem(1) currentColor;
        position: relative;
        opacity: 0;
        animation: build 2500ms ease infinite;

        &:not(:last-child) {
          margin-bottom: 12.5%;
        }

        &.half {
          width: 43.75%;
        }

        &:nth-child(2) {
          animation-name: build-2;

          &::after {
            animation-name: fill-2;
          }
        }

        &:nth-child(3) {
          animation-name: build-3;

          &::after {
            animation-name: fill-3;
          }
        }

        &:nth-child(1) {
          animation-name: build-4;

          &::after {
            animation-name: fill;
          }
        }

        &::after {
          content: '';
          display: block;
          background-color: currentColor;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          transform-origin: left;
          transform: scaleX(0);
          animation: fill-4 2500ms ease infinite;

          @keyframes fill {
            0%,
            40% {
              transform: scaleX(0);
            }

            55%,
            100% {
              transform: none;
            }
          }

          @keyframes fill-2 {
            0%,
            45% {
              transform: scaleX(0);
            }

            60%,
            100% {
              transform: none;
            }
          }

          @keyframes fill-3 {
            0%,
            50% {
              transform: scaleX(0);
            }

            65%,
            100% {
              transform: none;
            }
          }

          @keyframes fill-4 {
            0%,
            55% {
              transform: scaleX(0);
            }

            70%,
            100% {
              transform: none;
            }
          }
        }

        @keyframes build {
          0% {
            opacity: 0;
            transform: translateY(-0.5rem);
          }

          15%,
          100% {
            opacity: 1;
            transform: none;
          }
        }

        @keyframes build-2 {
          0%,
          10% {
            opacity: 0;
            transform: translateY(-0.5rem);
          }

          25%,
          100% {
            opacity: 1;
            transform: none;
          }
        }

        @keyframes build-3 {
          0%,
          20% {
            opacity: 0;
            transform: translateY(-0.5rem);
          }

          35%,
          100% {
            opacity: 1;
            transform: none;
          }
        }

        @keyframes build-4 {
          0%,
          30% {
            opacity: 0;
            transform: translateY(-0.5rem);
          }

          45%,
          100% {
            opacity: 1;
            transform: none;
          }
        }
      }
    }
  }
</style>
