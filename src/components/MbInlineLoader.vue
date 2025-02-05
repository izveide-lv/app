<template>
  <div class="inline-loader">
    <div class="brick-wrapper">
      <div class="brick left" />
      <div class="brick right" />
    </div>
  </div>
</template>

<script>
export default {
};
</script>

<style lang="scss" scoped>
  .inline-loader {
    display: flex;
    align-items: center;
    justify-content: center;

    .brick-wrapper {
      overflow: hidden;
      height: 0.625rem;
      width: 2.125rem;
      padding: rem(1);
      display: flex;
      justify-content: space-between;

      .brick {
        position: relative;
        width: 43.75%;
        height: 100%;
        box-shadow: inset 0 0 0 rem(1) currentColor, 0 0 0 rem(1) currentColor;

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
        }

        &.left {
          animation: build-left 1.5s ease infinite;

          @keyframes build-left {
            0% {
              transform: translateY(calc(-100% - 0.25rem));
              opacity: 0;
            }

            25%,
            70% {
              transform: none;
              opacity: 1;
            }

            95%,
            100% {
              transform: translateY(calc(100% + 0.5rem));
            }
          }

          &::after {
            animation: fill-left 1.5s ease infinite;

            @keyframes fill-left {
              0%,
              25% {
                transform: scalex(0);
              }

              50%,
              100% {
                transform: none;
              }
            }
          }
        }

        &.right {
          animation: build-right 1.5s ease infinite;

          @keyframes build-right {
            0%,
            5% {
              transform: translateY(calc(-100% - 0.25rem));
              opacity: 0;
            }

            35%,
            75% {
              transform: none;
              opacity: 1;
            }

            100% {
              transform: translateY(calc(100% + 0.5rem));
            }
          }

          &::after {
            animation: fill-right 1.5s ease infinite;

            @keyframes fill-right {
              0%,
              40% {
                transform: scalex(0);
              }

              75%,
              100% {
                transform: none;
              }
            }
          }
        }
      }
    }
  }
</style>
