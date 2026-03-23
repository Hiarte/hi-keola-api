"use strict";

const fs = require("fs");
const path = require("path");

const VERSION = 1;

/**
 * @param {unknown} entry
 * @returns {boolean}
 */
function isValidEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  const e = entry;
  return (
    typeof e.messageCount === "number" &&
    typeof e.wordsPerMessage === "number" &&
    typeof e.firstSeenAt === "number" &&
    typeof e.lastSeenAt === "number" &&
    typeof e.totalWordsFromOccurrences === "number"
  );
}

/**
 * @param {string} filePath
 * @returns {{ totalMessages: number; totalWords: number; byText: Map<string, object> } | null}
 */
function loadPersistedState(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (!data || data.version !== VERSION || typeof data.byText !== "object") {
      return null;
    }
    if (
      typeof data.totalMessages !== "number" ||
      typeof data.totalWords !== "number"
    ) {
      return null;
    }
    const byText = new Map();
    for (const [key, val] of Object.entries(data.byText)) {
      if (isValidEntry(val)) {
        byText.set(key, val);
      }
    }
    return {
      totalMessages: data.totalMessages,
      totalWords: data.totalWords,
      byText,
    };
  } catch (e) {
    if (e && e.code === "ENOENT") {
      return null;
    }
    console.warn(
      "Stats persist : fichier illisible, reprise à zéro.",
      e.message,
    );
    return null;
  }
}

/**
 * @param {string} filePath
 * @param {number} totalMessages
 * @param {number} totalWords
 * @param {Map<string, object>} byTextMap
 */
function savePersistedState(filePath, totalMessages, totalWords, byTextMap) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    version: VERSION,
    totalMessages,
    totalWords,
    byText: Object.fromEntries(byTextMap),
  };
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload), "utf8");
  fs.renameSync(tmp, filePath);
}

module.exports = {
  loadPersistedState,
  savePersistedState,
  VERSION,
};
