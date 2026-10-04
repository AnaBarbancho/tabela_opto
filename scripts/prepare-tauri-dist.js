#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "license-check.js",
  "optician-sans.regular.otf",
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

console.log(`Prepared Tauri web assets in ${path.relative(root, dist)}`);
