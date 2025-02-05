// function between(min, max) {
//   return Math.floor(Math.random() * (max - min + 1) + min);
// }
import SeededRNG from './SeededRNG';

function fgColor(color, force) {
  // calculate text color based on background
  // adapted from https://awik.io/determine-color-bright-dark-using-javascript/
  if (!color.startsWith('#') || !(color.length === 4 || color.length === 7)) throw new Error('Color has to be a HEX-Color code!');
  if (color.length === 4) color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`; // eslint-disable-line no-param-reassign

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

  if (force === 'light' && hsp < 240) return '#ffffff';
  if (force === 'dark' && hsp > 60) return '#111028';
  if (hsp > 127.5) return '#111028';
  return '#ffffff';
}

function rotatedGradient(ctx, x1, y1, x2, y2, index) {
  const points = ['tl', 'tr', 'bl', 'br'];
  const from = typeof index === 'number' ? points[Math.abs(index) % points.length] : points[Math.floor(Math.random() * points.length)];

  switch (from) {
    case 'tl':
      return ctx.createLinearGradient(x1, y1, x2, y2);
    case 'tr':
      return ctx.createLinearGradient(x2, y1, x1, y2);
    case 'bl':
      return ctx.createLinearGradient(x1, y2, x2, y1);
    case 'br':
      return ctx.createLinearGradient(x2, y2, x1, y1);
    default:
      return ctx.createLinearGradient(x1, y1, x2, y2);
  }
}

export default (userName, color, color2, textColor, seed = 'Mattrbld rocks!') => {
  const split = (userName || 'A').split(' ');
  const initials = split.length < 2 ? split[0][0].toUpperCase() : `${split[0][0]}${split[split.length - 1][0]}`.toUpperCase();
  const rng = new SeededRNG(seed);
  const weight = '700';
  const fontFamily = '"Inter", sans-serif';
  const size = 128;
  const x = size / 2;
  const y = size / 2;
  const offset = 4;
  const fs = size / 2.5;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const fg = fgColor(color, textColor);

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, color);
  bg.addColorStop(1, color2);

  const elements = ['square', 'diamond', 'circle'];
  const element = elements[Math.floor(rng.random() * elements.length)];

  c.width = size;
  c.height = size;
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;

  ctx.rect(0, 0, c.width, c.height);
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.lineWidth = 8;

  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    const radius = Math.floor(rng.random(40, 96)) + 8 * i;
    const elX = Math.floor(rng.random(-radius / 2, size - radius / 2)) + 8 * i;
    const elY = Math.floor(rng.random(-radius / 2, size - radius / 2)) + 8 * i;

    if (element === 'square') {
      const elementGradient = rotatedGradient(ctx, elX, elY, elX + radius, elY + radius, i);
      elementGradient.addColorStop(0, 'rgba(255,255,255,0.2)');
      elementGradient.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.strokeStyle = elementGradient;
      ctx.rect(elX, elY, radius, radius);
      ctx.stroke();
    } else if (element === 'diamond') {
      ctx.save();

      ctx.translate(size / 2, size / 2);
      ctx.rotate(Math.PI / 4);
      ctx.translate(elX, elY);

      const elementGradient = rotatedGradient(ctx, -radius / 2, -radius / 2, -radius / 2 + radius, -radius / 2 + radius, i);
      elementGradient.addColorStop(0, 'rgba(255,255,255,0.2)');
      elementGradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = elementGradient;

      ctx.rect(-radius / 2, -radius / 2, radius, radius);
      ctx.stroke();
      ctx.restore();
    } else {
      const elementGradient = rotatedGradient(ctx, elX - radius / 2, elY - radius / 2, elX + radius / 2, elY + radius / 2, i);
      elementGradient.addColorStop(0, 'rgba(255,255,255,0.2)');
      elementGradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = elementGradient;

      ctx.ellipse(elX, elY, radius / 2, radius / 2, 0, 0, 360);
      ctx.stroke();
    }
  }

  ctx.font = `${weight} ${fs}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(initials, x, y + offset);

  return c.toDataURL('image/jpeg', 0.8);
};
