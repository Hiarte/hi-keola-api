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
