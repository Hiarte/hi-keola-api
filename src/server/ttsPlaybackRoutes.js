"use strict";

const { queueStore } = require("../tts/queueStore");
const { audioCacheStore } = require("../tts/audioCacheStore");
const { QUEUE_STATUS } = require("../tts/constants");
const { resolvePublicBaseUrl } = require("./publicBaseUrl");
const { playbackMaxAgeMs } = require("../tts/playbackMaxAgeMs");

/**
 * @param {object} app — instance Fastify
 */
function registerTtsPlaybackRoutes(app) {
  /**
   * Liste les segments audio **prêts** pour un stream, dans l’ordre des `sequence`
   * (pour l’extension Twitch : poll + lecture des `audioUrl`).
   */
  app.get("/tts/:streamId/playback", async (req) => {
    const { streamId } = req.params;
    const rawAfter =
      req.query.afterSequence ?? req.query.after ?? req.query.since;
    const afterSequence = Number(rawAfter) || 0;
    const base = resolvePublicBaseUrl(req);
    const maxAgeMs = playbackMaxAgeMs();
    const now = Date.now();

    const items = queueStore
      .listItems()
      .filter((i) => {
        if (
          i.streamId !== streamId ||
          i.status !== QUEUE_STATUS.READY ||
          i.sequence <= afterSequence
        ) {
          return false;
        }
        const t = i.updatedAt ?? i.createdAt;
        if (typeof t !== "number" || t <= 0) {
          return false;
        }
        return now - t <= maxAgeMs;
      })
      .sort((a, b) => a.sequence - b.sequence);

    return {
      streamId,
      afterSequence,
      playbackMaxAgeMs: maxAgeMs,
      items: items.map((i) => {
        const fromItem = i.storagePath
          ? String(i.storagePath).split("\\").join("/")
          : "";
        const fromCache =
          !fromItem && i.cacheHash
            ? String(
                audioCacheStore.getByMessageHash(i.cacheHash)?.storagePath ||
                  "",
              ).split("\\").join("/")
            : "";
        const rel = fromItem || fromCache;
        return {
          id: i.id,
          sequence: i.sequence,
          status: i.status,
          formattedText: i.formattedText,
          cacheHash: i.cacheHash,
          audioId: i.audioId,
          audioUrl: rel ? `${base}/media/${rel}` : null,
        };
      }),
    };
  });
}

module.exports = { registerTtsPlaybackRoutes };
