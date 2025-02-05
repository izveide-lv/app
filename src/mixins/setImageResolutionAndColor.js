import { FastAverageColor } from 'fast-average-color';

export default {
  methods: {
    setImageResolutionAndColor(e) {
      const img = e.target;
      this.fileDetails.width = img.naturalWidth;
      this.fileDetails.height = img.naturalHeight;

      try {
        const fac = new FastAverageColor();
        const color = fac.getColor(img, { ignoredColor: [[0, 0, 0, 0], [255, 255, 255, 255]] });
        this.fileDetails.dominantColor = color.hex;
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.warn(err);
        // do nothing, it’s not that important
      }
    },
  },
};
