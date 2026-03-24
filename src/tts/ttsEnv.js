"use strict";

const { parseStability } = require("./providers/elevenlabs");

function resolveOutputFormat() {
  const explicit = process.env.ELEVENLABS_OUTPUT_FORMAT?.trim();
  if (explicit) {
    return explicit;
  }
  const f = (process.env.TTS_FORMAT || "mp3").toLowerCase();
  if (f === "mp3") {
    return "mp3_44100_128";
  }
  return "mp3_44100_128";
}

/**
 * @param {string | undefined} raw
 * @returns {number | undefined}
 */
function parseSimilarityBoost(raw) {
  if (raw === undefined || raw === "") {
    return undefined;
  }
  const n = parseFloat(String(raw), 10);
  if (Number.isNaN(n)) {
    return undefined;
  }
  if (n > 1) {
    return Math.min(1, Math.max(0, n / 100));
  }
  return Math.min(1, Math.max(0, n));
}

/**
 * Paramètres TTS issus de l’environnement (valeurs par défaut pour pipeline + worker).
 * @returns {{
 *   streamId: string;
 *   provider: string;
 *   apiKey: string;
 *   voice: string;
 *   format: string;
 *   outputFormat: string;
 *   speed: string;
 *   pitch: string;
 *   voiceSpeed: number | undefined;
 *   options: object;
 * }}
 */
function getTtsDefaults() {
  const streamId =
    process.env.STREAM_ID || process.env.TWITCH_CHANNEL || "default-stream";
  const apiKey =
    process.env.TTS_API_KEY || process.env.ELEVENLABS_API_KEY || "";
  const modelId =
    process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_v3";
  const stability = parseStability(
    process.env.ELEVENLABS_STABILITY,
    0.5,
  );
  const similarityBoost = parseSimilarityBoost(
    process.env.ELEVENLABS_SIMILARITY_BOOST,
  );
  const voiceSpeedRaw = process.env.ELEVENLABS_VOICE_SPEED ?? process.env.TTS_SPEED;
  let voiceSpeed;
  if (voiceSpeedRaw !== undefined && voiceSpeedRaw !== "") {
    const vs = parseFloat(String(voiceSpeedRaw), 10);
    if (!Number.isNaN(vs)) {
      voiceSpeed = vs;
    }
  }

  /** @type {Record<string, unknown>} */
  const options = {
    modelId,
    stability,
  };
  if (similarityBoost !== undefined) {
    options.similarity_boost = similarityBoost;
  }
  if (voiceSpeed !== undefined) {
    options.voiceSpeed = voiceSpeed;
  }

  return {
    streamId,
    provider: process.env.TTS_PROVIDER || "elevenlabs",
    apiKey,
    voice: process.env.TTS_VOICE || "default_voice",
    format: process.env.TTS_FORMAT || "mp3",
    outputFormat: resolveOutputFormat(),
    speed: process.env.TTS_SPEED ?? "1",
    pitch: process.env.TTS_PITCH ?? "0",
    voiceSpeed,
    options,
  };
}

module.exports = { getTtsDefaults };
