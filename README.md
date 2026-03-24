# hi-keola-api

Écoute un channel Twitch (sans envoyer de messages), normalise le texte pour du TTS (emotes **keola** + `tags.json`), enregistre des statistiques dans un fichier JSON et expose une API **Fastify**.

## Rôle de l’API vs extension Twitch

L’API **ne lit pas** l’audio dans le navigateur streamer : elle **fabrique** (TTS), **stocke** (MP3 sous `data/`), **sert** les fichiers en HTTP (`/media/...`) et **ordonne** les segments (`sequence` par `streamId`).  
L’**extension Twitch** récupère les **URLs** (ex. via `GET /tts/:streamId/playback`) et **joue** le son côté client.

Flux typique : message Keola traité → vérif cache / génération TTS → item `ready` avec chemin → l’extension poll l’API → lecture du MP3 à partir de `audioUrl`.

## Prérequis

- [Node.js](https://nodejs.org/) 18+

## Installation

```bash
git clone [URL-du-depot-GitHub]
cd hi-keola-api
npm install
cp .env.example .env
```

Éditer `.env` : `TWITCH_CHANNEL`, `TWITCH_TARGET_USERNAME`. Optionnel : `PORT`, `HOST`, `STATS_PERSIST_PATH`.

## Lancer

```bash
npm start
```

Développement (rechargement du code) : `npm run dev`  
Lint : `npm run lint`

## POC extension Twitch (lecture auto)

Dossier **`test-extension-twitch-lecture-auto/`** : page HTML qui poll `GET /tts/:streamId/playback` et joue les MP3. Voir le [README du POC](test-extension-twitch-lecture-auto/README.md). Activer **`CORS_ORIGIN=*`** (ou ton origine) dans le `.env` de l’API.

## Routes HTTP

| Méthode | Chemin | Réponse |
|--------|--------|---------|
| `GET` | `/messages/stats` | `{ totals, phrases }` — totaux persistants + liste des textes normalisés par fréquence |
| `GET` | `/messages/tags` | `{ tags }` — mapping emote → balise TTS (`tags.json`) |
| `GET` | `/tts/:streamId/playback` | Segments **`ready`** avec `sequence`, `audioUrl`, `formattedText`… Query : `afterSequence` (ou `after`) pour ne prendre que la suite |
| `GET` | `/media/*` | Fichiers sous `data/` (ex. MP3 : `/media/audio/<voice_id>/…`) |

`audioUrl` dans `playback` utilise **`PUBLIC_BASE_URL`** si défini (reverse proxy / HTTPS), sinon l’hôte de la requête.

Par défaut l’API écoute sur le port **3000** ; tu peux fixer un autre port avec **`PORT`** dans `.env` (ex. `PORT=55550` → `http://localhost:55550/...`).

## Pipeline TTS (cache + file + worker)

Après chaque message ciblé formaté :

1. Vérification du **cache audio** par `cacheHash` (tag + corps).
2. Si trouvé : log **`[TODO OUI HASH]`**, hit sur les métadonnées, item de file en **`ready`** avec `audioId`.
3. Sinon : item en **`pending`** ; le **worker** (si `TTS_WORKER_ENABLED=true`) prend le job, passe en **`processing`**, revérifie le cache, appelle **ElevenLabs**, écrit le MP3 sous `data/audio/...`, puis **`ready`**.

Fichiers JSON (sous `data/`, ignorés par git) : file `tts-queue.json`, cache `audio-cache.json`. MP3 générés : `data/audio/<voice_id>/<2 chars hash>/<ttsJobHash>.mp3`.

**ElevenLabs** : renseigner `TTS_API_KEY` ou `ELEVENLABS_API_KEY`, `TTS_VOICE` = **Voice ID**, `ELEVENLABS_MODEL_ID=eleven_v3` (ou autre modèle listé par l’API), `ELEVENLABS_STABILITY` entre 0 et 1. Activer `TTS_WORKER_ENABLED=true`. Réf. API : [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
