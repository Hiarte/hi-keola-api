"use strict";

const path = require("path");
const fastify = require("fastify");
const { normalizedMessageStore } = require("../stats/normalizedMessageStore");

/** @type {Record<string, string>} */
const emoteTags = require(path.join(__dirname, "..", "..", "tags.json"));

/**
 * @param {{ port?: number; host?: string }} [opts]
 * @returns {Promise<object>}
 */
async function startApi(opts = {}) {
  const port = opts.port ?? (Number(process.env.PORT) || 3000);
  const host = opts.host ?? process.env.HOST ?? "0.0.0.0";

  const app = fastify({ logger: false });

  app.get("/messages/stats", async () => {
    const totals = normalizedMessageStore.getTotals();
    const phrases = normalizedMessageStore.listByFrequency();
    return {
      totals,
      phrases,
    };
  });

  app.get("/messages/tags", async () => ({
    tags: emoteTags,
  }));

  await app.listen({ port, host });
  return app;
}

module.exports = { startApi };
