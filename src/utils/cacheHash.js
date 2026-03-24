"use strict";

const crypto = require("crypto");

/** Séparateur improbable dans le tag / le texte pour le concaténé hashé. */
const SEP = "\u0001";

/**
 * Hash SHA-256 (hex) pour clé de cache TTS : même couple [tag, texte] → même hash.
 * - `ttsTag` : balise TTS (ex. `[laughs]`) ou chaîne vide si pas de tag en tête.
 * - `ttsBody` : texte normalisé sans la balise (corps capitalisé).
 * @param {string} ttsTag
 * @param {string} ttsBody
 * @returns {string}
 */
function computeCacheHash(ttsTag, ttsBody) {
  const tag = ttsTag == null ? "" : String(ttsTag);
  const body = ttsBody == null ? "" : String(ttsBody);
  return crypto
    .createHash("sha256")
    .update(`${tag}${SEP}${body}`, "utf8")
    .digest("hex");
}

module.exports = { computeCacheHash };
