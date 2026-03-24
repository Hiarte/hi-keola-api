"use strict";

const crypto = require("crypto");

const SEP = "\u0002";

/**
 * Hash « provider » pour dédoublonner côté worker (voix, format, vitesse, etc.).
 * @param {{
 *   provider: string;
 *   voice: string;
 *   normalizedText: string;
 *   format: string;
 *   speed: string | number;
 *   pitch: string | number;
 *   options?: object;
 * }} p
 * @returns {string} hex SHA-256
 */
function computeTtsJobHash(p) {
  const optsStr =
    p.options != null && typeof p.options === "object"
      ? JSON.stringify(p.options, Object.keys(p.options).sort())
      : String(p.options ?? "");
  const parts = [
    String(p.provider ?? ""),
    String(p.voice ?? ""),
    String(p.normalizedText ?? ""),
    String(p.format ?? ""),
    String(p.speed ?? ""),
    String(p.pitch ?? ""),
    optsStr,
  ];
  return crypto
    .createHash("sha256")
    .update(parts.join(SEP), "utf8")
    .digest("hex");
}

module.exports = { computeTtsJobHash };
