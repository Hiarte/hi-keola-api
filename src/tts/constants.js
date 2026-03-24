"use strict";

/** Statuts possibles pour un item de file TTS. */
const QUEUE_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
};

module.exports = { QUEUE_STATUS };
