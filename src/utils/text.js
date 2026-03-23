"use strict";

/**
 * Met une majuscule uniquement à la première lettre du premier mot.
 * Exemple : "bonjour tout le monde" -> "Bonjour tout le monde"
 * @param {string} text
 * @returns {string}
 */
function firstCapitalize(text) {
  if (!text || typeof text !== "string") {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = { firstCapitalize };
