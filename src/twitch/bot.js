"use strict";

const tmi = require("tmi.js");
const { loadEnv } = require("../config/env");
const { formatTargetMessage } = require("../utils/formatTargetMessage");
const { normalizedMessageStore } = require("../stats/normalizedMessageStore");

function startBot() {
  const { TWITCH_CHANNEL, TWITCH_TARGET_USERNAME } = loadEnv();

  const client = new tmi.Client({
    options: { debug: false },
    channels: [TWITCH_CHANNEL],
  });

  client.connect().catch((err) => {
    console.error("Erreur de connexion Twitch :", err);
  });

  client.on("message", (_channel, userstate, message, self) => {
    if (self) {
      return;
    }

    const username = (
      userstate["display-name"] ||
      userstate.username ||
      ""
    ).toLowerCase();
    const targetUsername = TWITCH_TARGET_USERNAME.toLowerCase();

    if (username !== targetUsername) {
      return;
    }

    const { formattedText, allEmotes, keolaEmotes } = formatTargetMessage(
      message,
      userstate,
    );

    console.log("----- MESSAGE -----");
    console.log("Message brut :", message);
    console.log("Emotes détectées :", allEmotes);
    console.log("Emotes gardées :", keolaEmotes);
    console.log("Message formaté :", formattedText);

    const { entry, totals } = normalizedMessageStore.record(formattedText);
    if (entry) {
      console.log(
        "Stockage — fréquence (ce texte) :",
        entry.messageCount,
        "· mots (ce message) :",
        entry.wordsPerMessage,
        "· mots cumulés (ce texte) :",
        entry.totalWordsFromOccurrences,
      );
    }
    console.log(
      "Totaux (persistants) — messages :",
      totals.totalMessages,
      "· mots cumulés :",
      totals.totalWords,
      "· textes distincts :",
      totals.uniquePhrases,
    );
    console.log("-------------------------");
  });

  return client;
}

module.exports = { startBot };
