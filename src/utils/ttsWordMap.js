"use strict";

/**
 * Remplace des mots entiers (casse ignorée) par leur traduction TTS.
 * Ponctuation collée au mot est conservée après la valeur de remplacement.
 * @param {string} text
 * @param {Record<string, string>} rawMap — ex. { "XD": "[laughs]." }
 * @returns {string}
 */
function applyTtsWordMap(text, rawMap) {
  if (!text || typeof text !== "string" || !rawMap || typeof rawMap !== "object") {
    return text;
  }
  const lowerToValue = new Map(
    Object.entries(rawMap).map(([k, v]) => [
      String(k).toLowerCase(),
      String(v),
    ]),
  );
  return text
    .split(/(\s+)/)
    .map((chunk) => {
      if (/^\s+$/.test(chunk)) {
        return chunk;
      }
      const m = chunk.match(/^([\p{L}\p{M}\p{N}_]+)(.*)$/u);
      if (!m) {
        return chunk;
      }
      const [, word, suffix] = m;
      const rep = lowerToValue.get(word.toLowerCase());
      return rep !== undefined ? rep + suffix : chunk;
    })
    .join("");
}

module.exports = { applyTtsWordMap };
