// Generate a simple chat icon programmatically (ESM compatible)
// Creates build/icon.png and build/icon.ico

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '..', 'build');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const WIDTH = 512;
const HEIGHT = 512;

function hexToRGBA(hex, a = 255) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b, a];
}

function setPixel(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = rgba[0];
  png.data[idx + 1] = rgba[1];
  png.data[idx + 2] = rgba[2];
  png.data[idx + 3] = rgba[3];
}

function drawFilledCircle(png, cx, cy, r, rgba) {
  const r2 = r * r;
  for (let y = Math.max(0, cy - r); y < Math.min(png.height, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x < Math.min(png.width, cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(png, x, y, rgba);
    }
  }
}

function generateIcon() {
  // Start with fully transparent canvas
  const png = new PNG({ width: WIDTH, height: HEIGHT });

  // main chat bubble (circle) on transparent background
  const bubble = hexToRGBA('#3b82f6'); // blue-500
  // slightly larger, centered bubble
  drawFilledCircle(png, Math.floor(WIDTH * 0.54), Math.floor(HEIGHT * 0.50), 200, bubble);

  // tail (small circle overlapping bottom-left)
  drawFilledCircle(png, Math.floor(WIDTH * 0.30), Math.floor(HEIGHT * 0.74), 60, bubble);

  // ellipsis dots
  const dot = hexToRGBA('#ffffff');
  const baseY = Math.floor(HEIGHT * 0.50);
  const baseX = Math.floor(WIDTH * 0.52);
  const gap = 36;
  const r = 16;
  drawFilledCircle(png, baseX - gap, baseY, r, dot);
  drawFilledCircle(png, baseX, baseY, r, dot);
  drawFilledCircle(png, baseX + gap, baseY, r, dot);

  const pngPath = path.join(outDir, 'icon.png');
  const icoPath = path.join(outDir, 'icon.ico');
  png.pack().pipe(fs.createWriteStream(pngPath)).on('finish', async () => {
    try {
      const icoBuf = await pngToIco(pngPath);
      fs.writeFileSync(icoPath, icoBuf);
      console.log('✅ Generated icons:', pngPath, icoPath);
    } catch (e) {
      console.warn('⚠️ ICO generation failed, PNG is ready:', e?.message || e);
    }
  });
}

generateIcon();


