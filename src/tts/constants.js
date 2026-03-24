"use strict";

/** Statuts possibles pour un item de file TTS. */
const QUEUE_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
  /** Plus traité / plus exposé en playback : dépasse TTS_PLAYBACK_MAX_AGE_MS depuis l’enqueue. */
  EXPIRED: "expired",
};

module.exports = { QUEUE_STATUS };
