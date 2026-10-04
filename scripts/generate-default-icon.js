#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const size = 64;
const rowBytes = size * 4;
const xorSize = rowBytes * size;
const maskRowBytes = Math.ceil(size / 32) * 4;
const maskSize = maskRowBytes * size;
const imageSize = 40 + xorSize + maskSize;
const buffer = Buffer.alloc(6 + 16 + imageSize);

let offset = 0;
buffer.writeUInt16LE(0, offset); offset += 2; // reserved
buffer.writeUInt16LE(1, offset); offset += 2; // icon
buffer.writeUInt16LE(1, offset); offset += 2; // images

buffer.writeUInt8(size, offset); offset += 1;
buffer.writeUInt8(size, offset); offset += 1;
buffer.writeUInt8(0, offset); offset += 1; // colors
buffer.writeUInt8(0, offset); offset += 1; // reserved
buffer.writeUInt16LE(1, offset); offset += 2; // planes
buffer.writeUInt16LE(32, offset); offset += 2; // bpp
buffer.writeUInt32LE(imageSize, offset); offset += 4;
buffer.writeUInt32LE(22, offset); offset += 4;

buffer.writeUInt32LE(40, offset); offset += 4; // BITMAPINFOHEADER size
buffer.writeInt32LE(size, offset); offset += 4;
buffer.writeInt32LE(size * 2, offset); offset += 4; // color + mask height
buffer.writeUInt16LE(1, offset); offset += 2;
buffer.writeUInt16LE(32, offset); offset += 2;
buffer.writeUInt32LE(0, offset); offset += 4;
buffer.writeUInt32LE(xorSize + maskSize, offset); offset += 4;
buffer.writeInt32LE(0, offset); offset += 4;
buffer.writeInt32LE(0, offset); offset += 4;
buffer.writeUInt32LE(0, offset); offset += 4;
buffer.writeUInt32LE(0, offset); offset += 4;

const center = (size - 1) / 2;
for (let y = size - 1; y >= 0; y--) {
  for (let x = 0; x < size; x++) {
    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const inCircle = distance < 29;
    const inRing = distance > 20 && distance < 26;
    const inLetter = (x >= 18 && x <= 45 && (y >= 18 && y <= 24 || y >= 30 && y <= 35 || y >= 40 && y <= 46)) || (x >= 18 && x <= 24 && y >= 18 && y <= 46);

    let r = 16, g = 22, b = 28, a = 255;
    if (inCircle) { r = 23; g = 115; b = 121; }
    if (inRing) { r = 247; g = 249; b = 250; }
    if (inLetter) { r = 247; g = 249; b = 250; }

    buffer.writeUInt8(b, offset++);
    buffer.writeUInt8(g, offset++);
    buffer.writeUInt8(r, offset++);
    buffer.writeUInt8(a, offset++);
  }
}

offset += maskSize;

const outDir = path.resolve(__dirname, "..", "src-tauri", "icons");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon.ico"), buffer);
console.log("Generated src-tauri/icons/icon.ico");
