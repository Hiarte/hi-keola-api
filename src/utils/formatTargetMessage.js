"use strict";

const path = require("path");
const { firstCapitalize } = require("./text");
const {
  extractEmotesFromMessage,
  stripAllTwitchEmoteTokens,
  stripNonKeolaEmoteTokens,
  keepOnlyFirstKeolaEmoteToken,
  pickFirstKeolaEmote,
  isSingleEmoteOnlyMessage,
} = require("./emotes");
const { computeCacheHash } = require("./cacheHash");
const { applyTtsWordMap } = require("./ttsWordMap");

/** @type {Record<string, string>} */
const defaultEmoteTags = require(path.join(__dirname, "..", "..", "tags.json"));
/** @type {Record<string, string>} */
const defaultWordMap = require(path.join(
  __dirname,
  "..",
  "..",
  "tts-word-map.json",
));

/**
 * @param {string} message
 * @param {object} userstate
 * @param {Record<string, string>} [emoteTags]
 * @param {Record<string, string>} [wordMap] — mots → texte TTS (voir `tts-word-map.json`)
 * @returns {{
 *   formattedText: string;
 *   allEmotes: string[];
 *   keolaEmotes: string[];
 *   ttsTag: string;
 *   ttsBody: string;
 *   cacheHash: string;
 * }}
 */
function formatTargetMessage(
  message,
  userstate,
  emoteTags = defaultEmoteTags,
  wordMap = defaultWordMap,
) {
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
  const bodyMapped =
    trimmedBody === ""
      ? ""
      : applyTtsWordMap(trimmedBody, wordMap || {});
  const capitalizedBody =
    bodyMapped === "" ? "" : firstCapitalize(bodyMapped);

  const appendDot = isSingleEmoteOnlyMessage(message, userstate);

  let ttsBody = capitalizedBody;
  if (appendDot) {
    if (tag) {
      if (!capitalizedBody) {
        ttsBody = ".";
      }
    } else if (!capitalizedBody) {
      ttsBody = ".";
    } else if (!capitalizedBody.endsWith(".")) {
      ttsBody = `${capitalizedBody}.`;
    }
  }

  let formattedText;
  if (tag) {
    if (capitalizedBody) {
      formattedText = `${tag} ${capitalizedBody}`.trim();
    } else if (appendDot) {
      formattedText = `${tag}.`;
    } else {
      formattedText = tag;
    }
  } else {
    formattedText = ttsBody;
  }

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
