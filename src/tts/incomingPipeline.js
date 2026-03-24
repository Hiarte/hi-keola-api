"use strict";

const { getTtsDefaults } = require("./ttsEnv");
const { computeTtsJobHash } = require("./ttsJobHash");
const { audioCacheStore } = require("./audioCacheStore");
const { queueStore } = require("./queueStore");
const { QUEUE_STATUS } = require("./constants");

/**
 * Après formatage + `cacheHash` : vérifie le cache métadonnées, enqueue `ready` ou `pending`.
 * @param {{
 *   streamId?: string;
 *   originalMessage: string;
 *   formattedText: string;
 *   cacheHash: string;
 *   ttsTag: string;
 *   ttsBody: string;
 * }} payload
 * @returns {{ branch: string; queueItem: object }}
 */
function handleAfterFormat(payload) {
  const defaults = getTtsDefaults();
  const streamId = payload.streamId || defaults.streamId;
  const sequence = queueStore.nextSequence(streamId);

  const ttsJobHash = computeTtsJobHash({
    provider: defaults.provider,
    voice: defaults.voice,
    normalizedText: payload.formattedText,
    format: defaults.format,
    speed: defaults.speed,
    pitch: defaults.pitch,
    options: defaults.options,
  });

  const baseRow = {
    streamId,
    sequence,
    text: payload.originalMessage,
    normalizedText: payload.formattedText,
    formattedText: payload.formattedText,
    ttsTag: payload.ttsTag,
    ttsBody: payload.ttsBody,
    cacheHash: payload.cacheHash,
    ttsJobHash,
    voice: defaults.voice,
    provider: defaults.provider,
  };

  if (audioCacheStore.hasByMessageHash(payload.cacheHash)) {
    const cached = audioCacheStore.getByMessageHash(payload.cacheHash);
    console.log("[TODO OUI HASH]", {
      cacheHash: payload.cacheHash,
      audioId: cached?.audioId,
      storagePath: cached?.storagePath,
    });
    audioCacheStore.recordHitByMessageHash(payload.cacheHash);
    const queueItem = queueStore.enqueue({
      ...baseRow,
      status: QUEUE_STATUS.READY,
      audioId: cached ? cached.audioId : null,
      storagePath: cached?.storagePath ?? null,
    });
    return { branch: "cache_hit_message_hash", queueItem };
  }

  const queueItem = queueStore.enqueue({
    ...baseRow,
    status: QUEUE_STATUS.PENDING,
    audioId: null,
  });
  return { branch: "enqueued_pending", queueItem };
}

module.exports = { handleAfterFormat };
