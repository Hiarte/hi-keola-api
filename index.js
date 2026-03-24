"use strict";

require("dotenv").config();
const { startBot } = require("./src/twitch/bot");
const { startApi } = require("./src/server/api");
const { startTtsWorker } = require("./src/worker/ttsWorker");

startBot();

if (process.env.TTS_WORKER_ENABLED === "true") {
  startTtsWorker();
}

startApi().catch((err) => {
  console.error("Erreur démarrage API Fastify :", err);
  process.exit(1);
});
