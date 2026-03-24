"use strict";

const path = require("path");
const { firstCapitalize } = require("./text");
const {
  extractEmotesFromMessage,
  stripAllTwitchEmoteTokens,
  stripNonKeolaEmoteTokens,
  keepOnlyFirstKeolaEmoteToken,
  pickFirstKeolaEmote,
} = require("./emotes");
const { computeCacheHash } = require("./cacheHash");

/** @type {Record<string, string>} */
const defaultEmoteTags = require(path.join(__dirname, "..", "..", "tags.json"));

/**
 * @param {string} message
 * @param {object} userstate
 * @param {Record<string, string>} [emoteTags]
 * @returns {{
 *   formattedText: string;
 *   allEmotes: string[];
 *   keolaEmotes: string[];
 *   ttsTag: string;
 *   ttsBody: string;
 *   cacheHash: string;
 * }}
 */
function formatTargetMessage(message, userstate, emoteTags = defaultEmoteTags) {
  const allEmotes = extractEmotesFromMessage(message, userstate);
  const keolaEmotes = pickFirstKeolaEmote(message, userstate);
  const firstKeola = keolaEmotes[0];
  const tag = firstKeola ? emoteTags[firstKeola] : undefined;
  const ttsTag = tag || "";

  let bodyText;
  if (tag) {
    bodyText = stripAllTwitchEmoteTokens(message, allEmotes);
  } else {
    const textAfterStrip = stripNonKeolaEmoteTokens(message, allEmotes);
    bodyText = keepOnlyFirstKeolaEmoteToken(textAfterStrip);
  }

  const trimmedBody = bodyText.trim();
  const capitalizedBody =
    trimmedBody === ""
      ? ""
      : firstCapitalize(trimmedBody);

  let formattedText;
  if (tag) {
    formattedText = capitalizedBody
      ? `${tag} ${capitalizedBody}`.trim()
      : tag;
  } else {
    formattedText = capitalizedBody;
  }

  const ttsBody = capitalizedBody;
  const cacheHash = computeCacheHash(ttsTag, ttsBody);

  return {
    formattedText,
    allEmotes,
    keolaEmotes,
    ttsTag,
    ttsBody,
    cacheHash,
  };
}

module.exports = { formatTargetMessage };
