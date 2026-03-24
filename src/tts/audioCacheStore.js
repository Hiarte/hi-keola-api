"use strict";

const path = require("path");
const { loadJson, saveJson } = require("./persistTtsJson");

const VERSION = 1;

/**
 * Métadonnées d’un asset audio (cache TTS).
 * @typedef {{
 *   messageHash: string;
 *   ttsJobHash: string;
 *   audioId: string;
 *   storagePath: string;
 *   sizeBytes: number | null;
 *   durationMs: number | null;
 *   createdAt: number;
 *   lastAccessAt: number;
 *   generationCount: number;
 *   hitCount: number;
 * }} AudioAssetMeta
 */

function defaultState() {
  return {
    version: VERSION,
    byMessageHash: {},
    byTtsJobHash: {},
  };
}

function resolvePath() {
  return process.env.TTS_AUDIO_CACHE_PATH
    ? path.resolve(process.cwd(), process.env.TTS_AUDIO_CACHE_PATH)
    : path.join(process.cwd(), "data", "audio-cache.json");
}

class AudioCacheStore {
  constructor() {
    this._path = resolvePath();
    /** @type {{ version: number; byMessageHash: Record<string, AudioAssetMeta>; byTtsJobHash: Record<string, AudioAssetMeta> }} */
    this._state = loadJson(this._path, VERSION, defaultState);
  }

  _persist() {
    try {
      saveJson(this._path, this._state);
    } catch (e) {
      console.error("TTS audio cache : écriture impossible.", e.message);
    }
  }

  /**
   * @param {string} messageHash — hash tag+corps (`computeCacheHash`)
   * @returns {boolean}
   */
  hasByMessageHash(messageHash) {
    return Boolean(
      messageHash && this._state.byMessageHash[messageHash],
    );
  }

  /**
   * @param {string} ttsJobHash
   * @returns {boolean}
   */
  hasByTtsJobHash(ttsJobHash) {
    return Boolean(ttsJobHash && this._state.byTtsJobHash[ttsJobHash]);
  }

  /**
   * @param {string} messageHash
   * @returns {AudioAssetMeta | undefined}
   */
  getByMessageHash(messageHash) {
    return messageHash
      ? this._state.byMessageHash[messageHash]
      : undefined;
  }

  /**
   * @param {string} ttsJobHash
   * @returns {AudioAssetMeta | undefined}
   */
  getByTtsJobHash(ttsJobHash) {
    return ttsJobHash
      ? this._state.byTtsJobHash[ttsJobHash]
      : undefined;
  }

  /**
   * Incrémente hitCount / lastAccessAt pour une entrée connue par messageHash.
   * @param {string} messageHash
   */
  recordHitByMessageHash(messageHash) {
    const entry = this._state.byMessageHash[messageHash];
    if (!entry) {
      return;
    }
    this._bumpHit(entry);
  }

  /**
   * @param {string} ttsJobHash
   */
  recordHitByTtsJobHash(ttsJobHash) {
    const entry = this._state.byTtsJobHash[ttsJobHash];
    if (!entry) {
      return;
    }
    this._bumpHit(entry);
  }

  /** @param {AudioAssetMeta} entry */
  _bumpHit(entry) {
    const now = Date.now();
    entry.hitCount = (entry.hitCount || 0) + 1;
    entry.lastAccessAt = now;
    if (entry.messageHash) {
      this._state.byMessageHash[entry.messageHash] = entry;
    }
    if (entry.ttsJobHash) {
      this._state.byTtsJobHash[entry.ttsJobHash] = entry;
    }
    this._persist();
  }

  /**
   * Enregistre ou met à jour un asset (après génération worker).
   * @param {AudioAssetMeta} meta
   */
  upsertAsset(meta) {
    const now = Date.now();
    const full = {
      ...meta,
      lastAccessAt: meta.lastAccessAt ?? now,
      hitCount: meta.hitCount ?? 0,
      generationCount: meta.generationCount ?? 1,
    };
    this._state.byMessageHash[full.messageHash] = full;
    this._state.byTtsJobHash[full.ttsJobHash] = full;
    this._persist();
  }
}

const store = new AudioCacheStore();

module.exports = { AudioCacheStore, audioCacheStore: store };
