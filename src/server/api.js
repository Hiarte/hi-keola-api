"use strict";

const path = require("path");
const fastify = require("fastify");
const fastifyStatic = require("@fastify/static");
const fastifyCors = require("@fastify/cors");
const { normalizedMessageStore } = require("../stats/normalizedMessageStore");
const { registerTtsPlaybackRoutes } = require("./ttsPlaybackRoutes");

/** @type {Record<string, string>} */
const emoteTags = require(path.join(__dirname, "..", "..", "tags.json"));

/**
 * CORS pour le POC navigateur (`test-extension-twitch-lecture-auto`) :
 * - `CORS_ORIGIN=false` → pas de CORS
 * - `CORS_ORIGIN=*` ou liste d’origines → tel quel
 * - sinon, si **pas** `NODE_ENV=production` → tout autoriser (dev local)
 * - en production sans variable → pas de CORS (à configurer explicitement)
 * @returns {{ register: boolean; origin?: boolean | string[] }}
 */
function resolveCorsOptions() {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (raw === "false" || raw === "0") {
    return { register: false };
  }
  if (raw) {
    return {
      register: true,
      origin: raw === "*" ? true : raw.split(",").map((s) => s.trim()),
    };
  }
  if (process.env.NODE_ENV === "production") {
    return { register: false };
  }
  return { register: true, origin: true };
}

/**
 * @param {{ port?: number; host?: string }} [opts]
 * @returns {Promise<object>}
 */
async function startApi(opts = {}) {
  const port = opts.port ?? (Number(process.env.PORT) || 3000);
  const host = opts.host ?? process.env.HOST ?? "0.0.0.0";

  const app = fastify({ logger: false });

  const corsOpts = resolveCorsOptions();
  if (corsOpts.register) {
    await app.register(fastifyCors, {
      origin: corsOpts.origin,
    });
  }

  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "data"),
    prefix: "/media/",
    decorateReply: false,
  });

  app.get("/healthz", async () => ({ ok: true }));

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

  registerTtsPlaybackRoutes(app);

  await app.listen({ port, host });
  return app;
}

module.exports = { startApi };
