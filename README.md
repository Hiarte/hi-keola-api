# hi-keola-api

Écoute un channel Twitch (sans envoyer de messages), normalise le texte pour du TTS (emotes **keola** + `tags.json`), enregistre des statistiques dans un fichier JSON et expose une petite API **Fastify**.

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

## Routes HTTP

| Méthode | Chemin | Réponse |
|--------|--------|---------|
| `GET` | `/messages/stats` | `{ totals, phrases }` — totaux persistants + liste des textes normalisés par fréquence |
| `GET` | `/messages/tags` | `{ tags }` — mapping emote → balise TTS (`tags.json`) |

Par défaut l’API écoute sur le port **3000** (`http://localhost:3000/...`).

## Pipeline TTS (cache + file + worker)

Après chaque message ciblé formaté :

1. Vérification du **cache audio** par `cacheHash` (tag + corps).
2. Si trouvé : log **`[TODO OUI HASH]`**, hit sur les métadonnées, item de file en **`ready`** avec `audioId`.
3. Sinon : item en **`pending`** ; le **worker** (si `TTS_WORKER_ENABLED=true`) prend le job, passe en **`processing`**, recalcule le hash **provider** (`computeTtsJobHash`), revérifie le cache, puis **TODO** appel ElevenLabs + stockage objet.

Fichiers JSON (sous `data/`, ignorés par git) : file `tts-queue.json`, cache `audio-cache.json`. MP3 générés : `data/audio/<voice_id>/<2 chars hash>/<ttsJobHash>.mp3`.

**ElevenLabs** : renseigner `TTS_API_KEY` ou `ELEVENLABS_API_KEY`, `TTS_VOICE` = **Voice ID**, `ELEVENLABS_MODEL_ID=eleven_v3` (ou autre modèle listé par l’API), `ELEVENLABS_STABILITY` entre 0 et 1. Activer `TTS_WORKER_ENABLED=true`. Réf. API : [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
