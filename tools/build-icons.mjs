// Draws the app icons (icons/*.png) for the web manifest and the iOS home screen.
// No dependencies: the pin is the same shape as the favicon, rasterised here with 4x4
// supersampling and written as PNG with node's zlib. Run: node tools/build-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "icons");
const BLUE = [0x2a, 0x4b, 0xd7];
const WHITE = [0xff, 0xff, 0xff];

// the pin, in the favicon's 32x32 units: M16 30C14 24 6 19 6 12a10 10 0 0 1 20 0c0 7-8 12-10 18z
function pinPolygon() {
  const pts = [];
  const cubic = (p0, p1, p2, p3) => {
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
  };
  cubic([16, 30], [14, 24], [6, 19], [6, 12]);
  for (let i = 0; i <= 96; i++) {
    const a = Math.PI + (Math.PI * i) / 96; // over the top, left to right
    pts.push([16 + 10 * Math.cos(a), 12 + 10 * Math.sin(a)]);
  }
  cubic([26, 12], [26, 19], [18, 24], [16, 30]);
  return pts;
}
const PIN = pinPolygon();
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inRoundRect(x, y, size, r) {
  if (r <= 0) return x >= 0 && y >= 0 && x <= size && y <= size;
  const cx = Math.min(Math.max(x, r), size - r), cy = Math.min(Math.max(y, r), size - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

// size: output pixels; radius: corner radius as a share of size (0 = full bleed);
// pinScale: how much of the icon the 32-unit pin box takes up
function draw(size, radius, pinScale) {
  const S = 4; // supersampling
  const px = Buffer.alloc(size * size * 4);
  const box = size * pinScale, off = (size - box) / 2, unit = box / 32;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let bg = 0, white = 0;
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const fx = x + (sx + 0.5) / S, fy = y + (sy + 0.5) / S;
          if (!inRoundRect(fx, fy, size, radius * size)) continue;
          bg++;
          const ux = (fx - off) / unit, uy = (fy - off) / unit;
          if (ux >= 5.9 && ux <= 26.1 && uy >= 1.9 && uy <= 30.1 && inPoly(ux, uy, PIN) && (ux - 16) ** 2 + (uy - 12) ** 2 > 16) white++;
        }
      const n = S * S, i = (y * size + x) * 4;
      const w = bg ? white / bg : 0;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(BLUE[c] * (1 - w) + WHITE[c] * w);
      px[i + 3] = Math.round((255 * bg) / n);
    }
  return png(size, px);
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const ICONS = [
  ["icon-192.png", 192, 0.22, 0.625], // rounded square, like icons/icon.svg
  ["icon-512.png", 512, 0.22, 0.625],
  ["maskable-512.png", 512, 0, 0.44], // full bleed, pin inside the maskable safe zone
  ["apple-touch-icon.png", 180, 0, 0.56], // iOS rounds the corners itself
];
for (const [name, size, r, scale] of ICONS) {
  writeFileSync(path.join(OUT, name), draw(size, r, scale));
  console.log("wrote icons/" + name);
}
