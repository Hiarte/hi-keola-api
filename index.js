"use strict";

require("dotenv").config();
const { startBot } = require("./src/twitch/bot");
const { startApi } = require("./src/server/api");

startBot();

startApi().catch((err) => {
  console.error("Erreur démarrage API Fastify :", err);
  process.exit(1);
});
