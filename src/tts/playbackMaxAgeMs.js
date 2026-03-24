"use strict";

const DEFAULT_PLAYBACK_MAX_AGE_MS = 10_000;

function playbackMaxAgeMs() {
  const n = Number(process.env.TTS_PLAYBACK_MAX_AGE_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PLAYBACK_MAX_AGE_MS;
}

/**
 * Âge depuis l’enqueue (`createdAt`) au-delà duquel on ne doit plus synthétiser ni servir comme « nouveau ».
 * @param {{ createdAt?: number }} item
 * @param {number} [maxAgeMs]
 * @returns {boolean}
 */
function isItemPastPlaybackWindow(item, maxAgeMs = playbackMaxAgeMs()) {
  const t = item?.createdAt;
  if (typeof t !== "number" || t <= 0) {
    return false;
  }
  return Date.now() - t > maxAgeMs;
}

module.exports = {
  playbackMaxAgeMs,
  isItemPastPlaybackWindow,
  DEFAULT_PLAYBACK_MAX_AGE_MS,
};
