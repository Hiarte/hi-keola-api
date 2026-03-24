"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @param {string} filePath
 * @param {number} version
 * @param {() => object} emptyFactory
 * @returns {object}
 */
function loadJson(filePath, version, emptyFactory) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (!data || data.version !== version) {
      return emptyFactory();
    }
    return data;
  } catch (e) {
    if (e && e.code === "ENOENT") {
      return emptyFactory();
    }
    console.warn("TTS persist : lecture impossible.", filePath, e.message);
    return emptyFactory();
  }
}

/**
 * @param {string} filePath
 * @param {object} payload
 */
function saveJson(filePath, payload) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload), "utf8");
  fs.renameSync(tmp, filePath);
}

module.exports = { loadJson, saveJson };
