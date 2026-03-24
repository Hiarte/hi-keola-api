"use strict";

/**
 * @see https://elevenlabs.io/docs/api-reference/text-to-speech/convert
 * Header : `xi-api-key`. Body : `text`, `model_id`, `voice_settings` (stability, similarity_boost, speed, …).
 */

/**
 * Stabilité API : 0–1 (plus haut = plus monotone). Si la valeur env > 1, traitée comme pourcentage (ex. 55 → 0,55).
 * @param {string | undefined} raw
 * @param {number} defaultValue
 * @returns {number}
 */
function parseStability(raw, defaultValue) {
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  const n = parseFloat(String(raw), 10);
  if (Number.isNaN(n)) {
    return defaultValue;
  }
  if (n > 1) {
    return Math.min(1, Math.max(0, n / 100));
  }
  return Math.min(1, Math.max(0, n));
}

/**
 * @param {{
 *   apiKey: string;
 *   voiceId: string;
 *   text: string;
 *   modelId: string;
 *   stability: number;
 *   similarityBoost?: number;
 *   voiceSpeed?: number;
 *   outputFormat: string;
 * }} p
 * @returns {Promise<Buffer>}
 */
async function synthesizeToBuffer(p) {
  const base =
    process.env.ELEVENLABS_API_BASE?.trim() || "https://api.elevenlabs.io";
  const url = `${base}/v1/text-to-speech/${encodeURIComponent(p.voiceId)}?output_format=${encodeURIComponent(p.outputFormat)}`;

  /** @type {{ stability: number; similarity_boost?: number; speed?: number }} */
  const voice_settings = { stability: p.stability };
  if (p.similarityBoost != null && !Number.isNaN(p.similarityBoost)) {
    voice_settings.similarity_boost = Math.min(
      1,
      Math.max(0, p.similarityBoost),
    );
  }
  if (p.voiceSpeed != null && !Number.isNaN(p.voiceSpeed)) {
    voice_settings.speed = p.voiceSpeed;
  }

  const body = {
    text: p.text,
    model_id: p.modelId,
    voice_settings,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": p.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `ElevenLabs HTTP ${res.status}: ${errBody.slice(0, 800)}`,
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

module.exports = { synthesizeToBuffer, parseStability };
