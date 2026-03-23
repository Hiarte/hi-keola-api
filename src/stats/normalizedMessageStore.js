"use strict";

const path = require("path");
const { loadPersistedState, savePersistedState } = require("./persistStats");

/**
 * Nombre de mots (séquences non vides séparées par des espaces).
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  const t = text.trim();
  if (!t) {
    return 0;
  }
  return t.split(/\s+/).length;
}

/**
 * Stockage persistant des messages normalisés (fichier JSON), fréquences et agrégats mots / messages.
 */
class NormalizedMessageStore {
  /**
   * @param {{ persistPath: string }} options
   */
  constructor(options) {
    const persistPath = options.persistPath;
    /** @type {string} */
    this._persistPath = persistPath;

    /** @type {Map<string, { messageCount: number; wordsPerMessage: number; firstSeenAt: number; lastSeenAt: number; totalWordsFromOccurrences: number }>} */
    this._byText = new Map();
    this._totalMessages = 0;
    this._totalWords = 0;

    const loaded = loadPersistedState(persistPath);
    if (loaded) {
      this._totalMessages = loaded.totalMessages;
      this._totalWords = loaded.totalWords;
      this._byText = loaded.byText;
    }
  }

  _persist() {
    savePersistedState(
      this._persistPath,
      this._totalMessages,
      this._totalWords,
      this._byText,
    );
  }

  /**
   * Enregistre un message déjà normalisé (ex. sortie `formatTargetMessage`).
   * @param {string} formattedText
   * @returns {{ entry: object | null; totals: { totalMessages: number; totalWords: number; uniquePhrases: number } }}
   */
  record(formattedText) {
    if (typeof formattedText !== "string") {
      return {
        entry: null,
        totals: this.getTotals(),
      };
    }
    const key = formattedText.trim();
    if (!key) {
      return {
        entry: null,
        totals: this.getTotals(),
      };
    }

    const wordsPerMessage = countWords(key);
    const now = Date.now();

    this._totalMessages += 1;
    this._totalWords += wordsPerMessage;

    let entry = this._byText.get(key);
    if (!entry) {
      entry = {
        messageCount: 1,
        wordsPerMessage,
        firstSeenAt: now,
        lastSeenAt: now,
        totalWordsFromOccurrences: wordsPerMessage,
      };
      this._byText.set(key, entry);
    } else {
      entry.messageCount += 1;
      entry.lastSeenAt = now;
      entry.totalWordsFromOccurrences += wordsPerMessage;
    }

    try {
      this._persist();
    } catch (e) {
      console.error("Stats persist : écriture impossible.", e.message);
    }

    return {
      entry,
      totals: this.getTotals(),
    };
  }

  /**
   * Totaux cumulés (persistants) : chaque message ciblé enregistré compte pour 1 ; mots = somme sur toutes les occurrences.
   * @returns {{ totalMessages: number; totalWords: number; uniquePhrases: number }}
   */
  getTotals() {
    return {
      totalMessages: this._totalMessages,
      totalWords: this._totalWords,
      uniquePhrases: this._byText.size,
    };
  }

  /**
   * @deprecated Utiliser `getTotals()`.
   */
  getSessionTotals() {
    return this.getTotals();
  }

  /**
   * Détail pour une clé exacte (texte normalisé trim).
   * @param {string} formattedText
   */
  getEntry(formattedText) {
    if (typeof formattedText !== "string") {
      return undefined;
    }
    return this._byText.get(formattedText.trim());
  }

  /**
   * Liste triée par fréquence décroissante (pour inspection / API future).
   * @param {number} [limit]
   * @returns {Array<{ normalizedText: string; messageCount: number; wordsPerMessage: number; firstSeenAt: number; lastSeenAt: number; totalWordsFromOccurrences: number }>}
   */
  listByFrequency(limit) {
    const rows = [...this._byText.entries()].map(([normalizedText, e]) => ({
      normalizedText,
      ...e,
    }));
    rows.sort((a, b) => b.messageCount - a.messageCount);
    if (typeof limit === "number" && limit > 0) {
      return rows.slice(0, limit);
    }
    return rows;
  }
}

const defaultPersistPath = process.env.STATS_PERSIST_PATH
  ? path.resolve(process.cwd(), process.env.STATS_PERSIST_PATH)
  : path.join(process.cwd(), "data", "normalized-messages.json");

const store = new NormalizedMessageStore({
  persistPath: defaultPersistPath,
});

module.exports = {
  NormalizedMessageStore,
  normalizedMessageStore: store,
  countWords,
};
