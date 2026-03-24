"use strict";

const fs = require("fs");
const path = require("path");
const { audioCacheStore } = require("../tts/audioCacheStore");
const { queueStore } = require("../tts/queueStore");
const { computeTtsJobHash } = require("../tts/ttsJobHash");
const { getTtsDefaults } = require("../tts/ttsEnv");
const { QUEUE_STATUS } = require("../tts/constants");
const {
  playbackMaxAgeMs,
  isItemPastPlaybackWindow,
} = require("../tts/playbackMaxAgeMs");
const { synthesizeToBuffer } = require("../tts/providers/elevenlabs");

/**
 * Recalcule le hash « provider » et vérifie à nouveau le cache (course entre workers / générations).
 * @param {object} item
 * @returns {string}
 */
function recomputeTtsJobHashForItem(item) {
  const defaults = getTtsDefaults();
  return computeTtsJobHash({
    provider: item.provider || defaults.provider,
    voice: item.voice || defaults.voice,
    normalizedText: item.normalizedText || item.formattedText,
    format: defaults.format,
    speed: defaults.speed,
    pitch: defaults.pitch,
    options: defaults.options,
  });
}

/**
 * @param {object} item
 * @param {string} workerId
 */
function markReadyFromCache(item, workerId, cached) {
  audioCacheStore.recordHitByTtsJobHash(cached.ttsJobHash);
  queueStore.updateItem(item.id, {
    status: QUEUE_STATUS.READY,
    audioId: cached.audioId,
    workerId,
    storagePath: cached.storagePath,
  });
  console.log("[TTS worker] cache hit (job hash), ready", item.id, cached.audioId);
}

/**
 * @param {object} item
 * @param {string} workerId
 */
async function generateWithProvider(item, workerId) {
  const jobHash = recomputeTtsJobHashForItem(item);
  const defaults = getTtsDefaults();
  const maxAgeMs = playbackMaxAgeMs();

  if (isItemPastPlaybackWindow(item, maxAgeMs)) {
    queueStore.updateItem(item.id, {
      status: QUEUE_STATUS.EXPIRED,
      workerId,
      error: `dépasse la fenêtre playback (${maxAgeMs} ms)`,
    });
    console.log("[TTS worker] expiré (avant ElevenLabs)", item.id);
    return;
  }

  if (!defaults.apiKey.trim()) {
    queueStore.updateItem(item.id, {
      status: QUEUE_STATUS.FAILED,
      workerId,
      error: "TTS_API_KEY ou ELEVENLABS_API_KEY manquante",
    });
    return;
  }

  const voiceId = String(item.voice || defaults.voice || "").trim();
  if (!voiceId || voiceId === "default_voice") {
    queueStore.updateItem(item.id, {
      status: QUEUE_STATUS.FAILED,
      workerId,
      error:
        "TTS_VOICE doit être le voice_id ElevenLabs (dashboard → Voice ID, pas le nom affiché)",
    });
    return;
  }

  const text = String(
    item.normalizedText || item.formattedText || "",
  ).trim();
  if (!text) {
    queueStore.updateItem(item.id, {
      status: QUEUE_STATUS.FAILED,
      workerId,
      error: "Texte vide pour la synthèse",
    });
    return;
  }

  try {
    const buffer = await synthesizeToBuffer({
      apiKey: defaults.apiKey.trim(),
      voiceId,
      text,
      modelId: String(defaults.options.modelId || "eleven_v3"),
      stability: Number(defaults.options.stability ?? 0.5),
      similarityBoost: defaults.options.similarity_boost,
      voiceSpeed: defaults.voiceSpeed,
      outputFormat: defaults.outputFormat,
    });

    if (isItemPastPlaybackWindow(item, maxAgeMs)) {
      queueStore.updateItem(item.id, {
        status: QUEUE_STATUS.EXPIRED,
        workerId,
        error: `expiré pendant la synthèse (fenêtre ${maxAgeMs} ms)`,
      });
      console.log("[TTS worker] expiré (après ElevenLabs, fichier ignoré)", item.id);
      return;
    }

    const safeVoice = voiceId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
    const sub = jobHash.slice(0, 2);
    const fileName = `${jobHash}.mp3`;
    const relPath = path.join("audio", safeVoice, sub, fileName);
    const absPath = path.join(process.cwd(), "data", relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, buffer);

    const now = Date.now();
    const storagePath = relPath.split(path.sep).join("/");
    const meta = {
      messageHash: item.cacheHash,
      ttsJobHash: jobHash,
      audioId: jobHash,
      storagePath,
      sizeBytes: buffer.length,
      durationMs: null,
      createdAt: now,
      lastAccessAt: now,
      generationCount: 1,
      hitCount: 0,
    };
    audioCacheStore.upsertAsset(meta);

    queueStore.updateItem(item.id, {
      status: QUEUE_STATUS.READY,
      audioId: jobHash,
      storagePath,
      workerId,
      error: undefined,
    });
    console.log("[TTS worker] ElevenLabs OK", item.id, storagePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[TTS worker] ElevenLabs erreur", msg);
    queueStore.updateItem(item.id, {
      status: QUEUE_STATUS.FAILED,
      workerId,
      error: msg,
    });
  }
}

/**
 * Traite un item verrouillé (`processing`).
 * @param {object} item
 * @param {string} workerId
 */
async function processItem(item, workerId) {
  const maxAgeMs = playbackMaxAgeMs();
  if (isItemPastPlaybackWindow(item, maxAgeMs)) {
    queueStore.updateItem(item.id, {
      status: QUEUE_STATUS.EXPIRED,
      workerId,
      error: `dépasse la fenêtre playback (${maxAgeMs} ms)`,
    });
    console.log("[TTS worker] expiré (cache / synthèse ignorés)", item.id);
    return;
  }

  const jobHash = recomputeTtsJobHashForItem(item);

  if (audioCacheStore.hasByTtsJobHash(jobHash)) {
    const cached = audioCacheStore.getByTtsJobHash(jobHash);
    if (cached) {
      markReadyFromCache(item, workerId, cached);
      return;
    }
  }

  if (item.cacheHash && audioCacheStore.hasByMessageHash(item.cacheHash)) {
    const cached = audioCacheStore.getByMessageHash(item.cacheHash);
    if (cached) {
      markReadyFromCache(item, workerId, cached);
      return;
    }
  }

  await generateWithProvider(item, workerId);
}

let _timer = null;

/**
 * @param {{ pollMs?: number; workerId?: string }} [opts]
 */
function startTtsWorker(opts = {}) {
  const pollMs =
    opts.pollMs ?? (Number(process.env.TTS_WORKER_POLL_MS) || 3000);
  const workerId =
    opts.workerId ||
    process.env.TTS_WORKER_ID ||
    `worker-${process.pid}`;

  const tick = async () => {
    try {
      const item = queueStore.claimNextPending(workerId);
      if (!item) {
        return;
      }
      await processItem(item, workerId);
    } catch (e) {
      console.error("[TTS worker]", e);
    }
  };

  if (_timer) {
    clearInterval(_timer);
  }
  _timer = setInterval(() => {
    tick();
  }, pollMs);
  tick();
  return { workerId, pollMs };
}

function stopTtsWorker() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { startTtsWorker, stopTtsWorker, processItem };
