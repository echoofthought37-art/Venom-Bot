# 🐍 Venom MD — WhatsApp Bot

A powerful WhatsApp bot built with Baileys. Users pair their number on the pairing site, get a session ID in their WhatsApp DM, and host their own bot on Render in minutes.

---

## How It Works

1. User visits the pairing site
2. Enters their WhatsApp number → receives a pairing code
3. Enters the code in WhatsApp → Linked Devices → Link a Device → Link with phone number
4. Bot sends a **Session ID** (`VENOM_XXXXXXXX`) to their WhatsApp DM
5. User deploys on Render using that session ID

---

## Deploy on Render

### 1. Fork this repo

Click **Fork** on GitHub, then go to [render.com](https://render.com).

### 2. Create a Web Service

- New → Web Service
- Connect your forked repo
- **Runtime:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `node artifacts/api-server/dist/index.mjs`

### 3. Add Environment Variables

| Variable | Value |
|---|---|
| `SESSION_ID` | The `VENOM_XXXXXXXX` ID from your WhatsApp DM |
| `OWNER_NUMBER` | Your number with country code, no `+` (e.g. `2348021016309`) |
| `PAIRING_SITE_URL` | URL of the deployed pairing site (e.g. `https://venom-md.onrender.com`) |

Only these 3 are required. Everything else is pre-configured.

### 4. Deploy

Click **Deploy Web Service**. Your bot connects automatically and stays online 24/7.

---

## Commands

The bot supports 90+ commands across 14 categories. Send `.menu` in any chat to see the full list.

| Category | Example Commands |
|---|---|
| AI | `.ai`, `.dalle`, `.roast`, `.lyrics` |
| Downloader | `.yt`, `.fb`, `.tt`, `.ig` |
| Fun | `.meme`, `.joke`, `.quote` |
| Groups | `.kick`, `.add`, `.promote`, `.everyone` |
| Economy | `.balance`, `.daily`, `.transfer` |
| Tools | `.translate`, `.weather`, `.sticker` |
| Owner | `.ban`, `.broadcast`, `.mode` |

---

## Environment Variables (Full List)

| Variable | Required | Description |
|---|---|---|
| `SESSION_ID` | ✅ | Short session ID from the pairing site |
| `OWNER_NUMBER` | ✅ | Your WhatsApp number (country code, no `+`) |
| `PAIRING_SITE_URL` | ✅ | URL of the pairing site |
| `OPENAI_API_KEY` | Optional | For AI commands (`.ai`, `.dalle`, `.roast`) |
| `REMOVEBG_API_KEY` | Optional | For background removal (defaults to demo key) |

---

## Pairing Site

The pairing site is the `artifacts/pairing-site` folder — a React app that lets any user link their WhatsApp and get a session ID. Deploy it separately on Render as a **Static Site** or second Web Service.

---

## Tech Stack

- [Baileys](https://github.com/WhiskeySockets/Baileys) — WhatsApp Web API
- [Fastify](https://fastify.dev) — API server
- [React + Vite](https://vitejs.dev) — Pairing site
- [OpenAI](https://openai.com) — AI commands

---

**Powered by Taprush EMP 🐍**
