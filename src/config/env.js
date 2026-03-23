"use strict";

/**
 * @returns {{
 *   TWITCH_CHANNEL: string;
 *   TWITCH_TARGET_USERNAME: string;
 * }}
 */
function loadEnv() {
  const { TWITCH_CHANNEL, TWITCH_TARGET_USERNAME } = process.env;

  if (!TWITCH_CHANNEL || !TWITCH_TARGET_USERNAME) {
    console.error("Variables .env manquantes.");
    process.exit(1);
  }

  return {
    TWITCH_CHANNEL,
    TWITCH_TARGET_USERNAME,
  };
}

module.exports = { loadEnv };
