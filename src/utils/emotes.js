"use strict";

/**
 * Occurrences d'emotes dans l'ordre d'apparition dans le message (index de début croissant).
 * @param {string} message
 * @param {object} userstate
 * @returns {{ start: number; end: number; text: string }[]}
 */
function extractEmoteOccurrences(message, userstate) {
  const emotes = userstate.emotes;
  if (!emotes) {
    return [];
  }

  const found = [];

  for (const emoteId of Object.keys(emotes)) {
    for (const range of emotes[emoteId]) {
      const [start, end] = range.split("-").map(Number);
      found.push({
        start,
        end,
        text: message.substring(start, end + 1),
      });
    }
  }

  found.sort((a, b) => a.start - b.start);
  return found;
}

/**
 * Extrait les noms d'emotes Twitch depuis les tags tmi.js (ordre gauche → droite).
 * @param {string} message
 * @param {object} userstate — tags tmi.js (emotes, etc.)
 * @returns {string[]}
 */
function extractEmotesFromMessage(message, userstate) {
  return extractEmoteOccurrences(message, userstate).map((o) => o.text);
}

/**
 * Retire tous les tokens dont le texte figure dans la liste d’emotes Twitch (tags IRC).
 * @param {string} text
 * @param {string[]} emoteTexts — ex. résultat de `extractEmotesFromMessage`
 * @returns {string}
 */
function stripAllTwitchEmoteTokens(text, emoteTexts) {
  if (!text || typeof text !== "string") {
    return text;
  }
  const set = new Set(emoteTexts);
  if (set.size === 0) {
    return text.trim();
  }
  return text
    .split(/\s+/)
    .filter((token) => !set.has(token))
    .join(" ")
    .trim();
}

/**
 * Retire du texte les tokens qui sont des emotes Twitch mais ne commencent pas par "keola"
 * (insensible à la casse sur le préfixe).
 * @param {string} text
 * @param {string[]} emoteTexts — occurrences extraites des tags (une entrée par occurrence)
 * @returns {string}
 */
function stripNonKeolaEmoteTokens(text, emoteTexts) {
  if (!text || typeof text !== "string") {
    return text;
  }
  const removeSet = new Set(
    emoteTexts.filter(
      (e) => typeof e === "string" && !e.toLowerCase().startsWith("keola"),
    ),
  );
  if (removeSet.size === 0) {
    return text;
  }
  return text
    .split(/\s+/)
    .filter((token) => !removeSet.has(token))
    .join(" ")
    .trim();
}

/**
 * Ne garde qu'un seul token commençant par "keola" : le premier dans le texte (mots séparés par des espaces).
 * @param {string} text
 * @returns {string}
 */
function keepOnlyFirstKeolaEmoteToken(text) {
  if (!text || typeof text !== "string") {
    return text;
  }
  let keptFirstKeola = false;
  return text
    .split(/\s+/)
    .filter((token) => {
      if (!token.toLowerCase().startsWith("keola")) {
        return true;
      }
      if (!keptFirstKeola) {
        keptFirstKeola = true;
        return true;
      }
      return false;
    })
    .join(" ")
    .trim();
}

/**
 * Première emote dont le texte commence par "keola" (ordre dans le message), seule.
 * @param {string} message
 * @param {object} userstate
 * @returns {string[]}
 */
function pickFirstKeolaEmote(message, userstate) {
  const first = extractEmoteOccurrences(message, userstate).find((o) =>
    o.text.toLowerCase().startsWith("keola"),
  );
  return first ? [first.text] : [];
}

/**
 * Le message (hors espaces) est exactement un seul token, et ce token est une seule emote Twitch (plage IRC).
 * @param {string} message
 * @param {object} userstate
 * @returns {boolean}
 */
function isSingleEmoteOnlyMessage(message, userstate) {
  const trimmed = String(message || "").trim();
  if (!trimmed) {
    return false;
  }
  const occ = extractEmoteOccurrences(message, userstate);
  if (occ.length !== 1) {
    return false;
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length !== 1) {
    return false;
  }
  const o = occ[0];
  if (tokens[0] !== o.text) {
    return false;
  }
  return o.start === 0 && o.end === trimmed.length - 1;
}

module.exports = {
  extractEmoteOccurrences,
  extractEmotesFromMessage,
  stripAllTwitchEmoteTokens,
  stripNonKeolaEmoteTokens,
  keepOnlyFirstKeolaEmoteToken,
  pickFirstKeolaEmote,
  isSingleEmoteOnlyMessage,
};
