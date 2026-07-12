const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// pdf.js is copied to assets/pdfjs/pdf.min.bundle by scripts/embed-pdfjs.mjs
config.resolver.assetExts.push("bundle");

module.exports = config;
