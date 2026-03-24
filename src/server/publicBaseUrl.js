"use strict";

/**
 * URL publique de l’API (pour construire les liens MP3 côté extension Twitch).
 * Priorité : `PUBLIC_BASE_URL` ; sinon `X-Forwarded-Proto` + `Host` (proxy) ; sinon la requête.
 * @param {{ protocol?: string; headers: Record<string, string | string[] | undefined> }} req
 * @returns {string} sans slash final
 */
function resolvePublicBaseUrl(req) {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  const host = req.headers.host || "localhost:3000";
  const xfProto = req.headers["x-forwarded-proto"];
  const proto =
    (Array.isArray(xfProto) ? xfProto[0] : xfProto) ||
    req.protocol ||
    "http";
  return `${proto}://${host}`;
}

module.exports = { resolvePublicBaseUrl };
