"use strict";

const crypto = require("crypto");
const path = require("path");
const { loadJson, saveJson } = require("./persistTtsJson");
const { QUEUE_STATUS } = require("./constants");

const VERSION = 1;

function defaultState() {
  return {
    version: VERSION,
    sequenceByStreamId: {},
    items: [],
  };
}

function resolvePath() {
  return process.env.TTS_QUEUE_PATH
    ? path.resolve(process.cwd(), process.env.TTS_QUEUE_PATH)
    : path.join(process.cwd(), "data", "tts-queue.json");
}

class QueueStore {
  constructor() {
    this._path = resolvePath();
    this._state = loadJson(this._path, VERSION, defaultState);
    if (!Array.isArray(this._state.items)) {
      this._state.items = [];
    }
    if (!this._state.sequenceByStreamId) {
      this._state.sequenceByStreamId = {};
    }
  }

  _persist() {
    try {
      saveJson(this._path, this._state);
    } catch (e) {
      console.error("TTS queue : écriture impossible.", e.message);
    }
  }

  /**
   * @param {string} streamId
   * @returns {number}
   */
  nextSequence(streamId) {
    const key = streamId || "default";
    const cur = this._state.sequenceByStreamId[key] ?? 0;
    const next = cur + 1;
    this._state.sequenceByStreamId[key] = next;
    this._persist();
    return next;
  }

  /**
   * @param {object} row
   * @returns {object} item avec id
   */
  enqueue(row) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const item = {
      id,
      createdAt: now,
      updatedAt: now,
      retryCount: row.retryCount ?? 0,
      ...row,
    };
    this._state.items.push(item);
    this._persist();
    return item;
  }

  /**
   * Premier item `pending`, passé en `processing` (verrou worker).
   * @param {string} workerId
   * @returns {object | null}
   */
  claimNextPending(workerId) {
    const item = this._state.items.find(
      (i) => i.status === QUEUE_STATUS.PENDING,
    );
    if (!item) {
      return null;
    }
    const now = Date.now();
    item.status = QUEUE_STATUS.PROCESSING;
    item.workerId = workerId;
    item.startedAt = now;
    item.updatedAt = now;
    this._persist();
    return item;
  }

  /**
   * @param {string} id
   * @param {object} patch
   */
  updateItem(id, patch) {
    const item = this._state.items.find((i) => i.id === id);
    if (!item) {
      return null;
    }
    Object.assign(item, patch, { updatedAt: Date.now() });
    this._persist();
    return item;
  }

  /**
   * @returns {object[]}
   */
  listItems() {
    return [...this._state.items];
  }
}

const store = new QueueStore();

module.exports = { QueueStore, queueStore: store };
