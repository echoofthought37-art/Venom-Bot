# 🐍 VENOM MD — WhatsApp Bot

> *Strike without a sound. Rule without being seen.*
> Made by **Taprush EMP**

---

## 📌 What is Venom MD?

Venom MD is a powerful multi-device WhatsApp bot built on **Baileys**. It supports 100+ commands including group management, AI chat, ghost/stealth operations, identity manipulation, silent admin takeovers, downloaders, economy games, and much more.

---

## ⚡ Features

| Category | Highlights |
|---|---|
| 👻 Ghost Mode | Invisible messages, blank bubbles, black messages |
| 🕶️ Invisible Tags | Silent tag all, shadow mention, zero-notification tags |
| 💨 Vanish | Auto-delete messages, wipe your tracks |
| 🔇 Silent Admin | Kick/add/promote/demote/sweep with no system notices |
| 🎭 Identity | Impersonate, fake-quote, mirror, possession mode |
| 👥 Clone | Clone anyone's DP, bio, name — full identity theft |
| 💀 Takeover | Fake security alert trap that hands you the whole group |
| 👻 Stealth | No read receipts, no online status, no typing indicator |
| 💣 Attacks | Phantom bomb, message flood |
| 🤖 AI | ChatGPT / Gemini chat, DALL-E image generation |
| 📥 Downloaders | YouTube MP3/MP4, TikTok, Instagram, Facebook |
| 🛡️ Anti | Antilink, antibot, antispam, antinsfw, antiraid, etc. |
| 💰 Economy | Coins, XP, levels, daily rewards, leaderboard |
| 🎮 Fun | Roast, jokes, quotes, 8ball, trivia, ship |

---

## 🚀 Quick Deploy

### Option 1 — Render (Recommended, Free)

1. **Fork this repo** on GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your forked repo
4. Set the following:
   - **Build Command:** `npm install`
   - **Start Command:** `node dist/index.mjs` *(or leave default if detected)*
5. Add these **Environment Variables:**

| Variable | Value | Required |
|---|---|---|
| `SESSION_ID` | Your session ID (e.g. `VENOM_AB12CD34`) | ✅ |
| `OWNER_NUMBER` | Your WhatsApp number (e.g. `2348021016309`) | ✅ |
| `BOT_NAME` | Custom bot name (default: `Venom MD`) | Optional |
| `BOT_PREFIX` | Command prefix (default: `.`) | Optional |
| `OPENAI_API_KEY` | OpenAI API key for AI commands | Optional |
| `PAIRING_SITE_URL` | URL of this deployment (for session delivery) | Optional |

6. Click **Deploy** — your bot will be live in ~2 minutes!

> 💡 **Getting your SESSION_ID:** Connect the bot once (via Replit or locally), use `.session` to get your short session ID, then add it as the `SESSION_ID` env var on Render.

---

### Option 2 — Railway

1. Fork this repo
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your fork
4. Go to **Variables** and add the same env vars listed above
5. Railway auto-detects the start command from `package.json`

---

### Option 3 — Koyeb

1. Fork this repo
2. Go to [koyeb.com](https://koyeb.com) → **Create App → GitHub**
3. Select your fork, set region, add env vars
4. Deploy

---

### Option 4 — Run Locally

```bash
# Clone the repo
git clone https://github.com/echoofthought37-art/Venom-Bot.git
cd Venom-Bot

# Install dependencies
npm install   # or: pnpm install

# Set environment variables (create a .env file)
OWNER_NUMBER=2348021016309
BOT_NAME=Venom MD
BOT_PREFIX=.
# Optional: OPENAI_API_KEY=sk-...

# Start the bot
npm run dev
```

On first run with no session, the bot prints a **pairing code** in the console. Enter it in WhatsApp under **Settings → Linked Devices → Link a Device**.

---

## 🔑 First-Time Setup (Pairing)

1. Start the bot (locally or on a hosting platform)
2. Check the logs — you will see:

   ```
   🐍 VENOM MD PAIRING CODE: XXXX-XXXX
   Enter this code in WhatsApp > Linked Devices > Link a Device
   ```

3. Open WhatsApp on your phone → **Settings → Linked Devices → Link a Device**
4. Enter the 8-character code
5. The bot connects and sends you a welcome message on WhatsApp ✅

---

## 📋 Commands Overview

All commands use the `.` prefix by default (change with `.setprefix`).

### General
```
.menu / .help     — Full command list
.ping             — Check response time
.alive            — Bot status + uptime
.info             — System info
.stats            — Usage statistics
```

### 👑 Owner-Only Ghost Commands
```
.ghoston/off      — Toggle invisible message mode
.ghostmsg [text]  — Send single invisible message
.blackmsg         — Send black bubble message
.empty            — Send completely empty message

.shadow @user     — Silent tag (no notification)
.silenttag        — Tag all members silently
.hidemen [text]   — Mention everyone, no pings

.vanish [secs]    — Auto-delete message after N seconds
.void             — Wipe all your recent messages

.silentkick @u    — Kick with no system notice
.silentadd @u     — Add with no system notice
.silentpromote @u — Promote with no system notice
.silentdemote @u  — Demote with no system notice
.silentdemoteall  — Demote all admins silently
.sweep            — Demote + kick all admins
.coup             — Make yourself only admin silently

.impersonate @u   — Send message as someone else
.fakequote @u     — Create fake reply attributed to target
.mirror @u        — Bot echoes everything target says
.possession @u    — Bot responds as if it's the target

.clonedp @u       — Copy target's profile picture
.clonebio @u      — Copy target's bio/status
.clonename @u     — Copy target's display name
.cloneall @u      — Clone everything at once
.revert           — Return to VENOM identity

.silentgcname     — Change group name silently
.silentgcdesc     — Change group description silently
.silentgcicon     — Change group icon silently
.silentlock       — Lock group (no system message)
.silentunlock     — Unlock group silently

.security         — Post fake security alert (takeover trap)
.claim            — Announce VENOM group control
.cover            — Delete takeover evidence
.expose           — Reveal yourself as owner

.stealth          — Full stealth (no receipts, no status)
.unstealth        — Return to normal
.silentread       — Read without blue ticks

.phantombomb [n]  — Flood chat with invisible messages
.bomb [n] [text]  — Flood chat with a message N times
```

### Self-Reply Mode
Venom MD supports **self-reply** — type any command from your own WhatsApp and the bot responds in that same chat. No need for a second number.

```
.self    — Switch to self mode (only owner can trigger commands)
.public  — Switch to public mode (anyone can use commands)
```

---

## ⚙️ Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `OWNER_NUMBER` | `2348021016309` | Your WhatsApp number (no + or spaces) |
| `SESSION_ID` | — | Short session ID from the pairing site |
| `SESSION_STRING` | — | Full session string (legacy fallback) |
| `PAIRING_SITE_URL` | — | URL where sessions are stored |
| `BOT_NAME` | `Venom MD` | Display name of the bot |
| `BOT_PREFIX` | `.` | Command trigger character |
| `OPENAI_API_KEY` | — | For `.ai` and `.dalle` commands |
| `KILLSWITCH` | — | Set to `1` to immediately pause the bot |

---

## 🛡️ Keep Alive on Render (Free Tier)

Render's free tier sleeps after 15 minutes of inactivity. To keep the bot running 24/7:

1. Use [UptimeRobot](https://uptimerobot.com) (free)
2. Create a new HTTP monitor pointing to your Render URL: `https://your-app.onrender.com/api/healthz`
3. Set interval to **5 minutes**
4. The bot stays awake permanently

---

## 📁 Project Structure

```
artifacts/api-server/
├── src/
│   ├── bot/
│   │   ├── index.ts        — Bot connection + pairing
│   │   ├── handler.ts      — Message routing + self-reply
│   │   ├── config.ts       — Bot configuration
│   │   ├── state.ts        — In-memory state store
│   │   ├── session.ts      — Session string encode/decode
│   │   ├── utils.ts        — Shared helpers
│   │   └── plugins/
│   │       ├── ghost.ts    — 🐍 Ghost/stealth/takeover/clone
│   │       ├── general.ts  — Basic commands + menu
│   │       ├── groups.ts   — Group management
│   │       ├── ai.ts       — AI chat + image gen
│   │       ├── tools.ts    — Sticker, TTS, translate
│   │       ├── downloader.ts — YouTube, TikTok, IG
│   │       ├── stealth.ts  — Mimic, ghosttag, steal
│   │       ├── throne.ts   — Takeover, autoadmin
│   │       ├── nuclear.ts  — Broadcast, strike, spy
│   │       ├── economy.ts  — Coins, XP, leaderboard
│   │       ├── fun.ts      — Roast, jokes, games
│   │       ├── anti.ts     — Anti-spam/link/nsfw
│   │       ├── mode.ts     — Bot mode settings
│   │       └── owner.ts    — Owner-only commands
│   ├── routes/             — Express API routes
│   └── lib/                — Logger
```

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| Bot not connecting | Check logs for pairing code, re-enter in WhatsApp |
| Session expired | Delete the `./session` folder and re-pair |
| Commands not working | Check prefix with `.alive`, default is `.` |
| AI commands not working | Add `OPENAI_API_KEY` to env vars |
| Bot sleeping on Render | Set up UptimeRobot pinging `/api/healthz` every 5 min |
| `SESSION_ID` not working | Make sure `PAIRING_SITE_URL` is also set |

---

## 📜 License

MIT — Free to fork, modify, and deploy.

---

> 🐍 **VENOM MD** | *Strike without a sound. Rule without being seen.* | Made by **Taprush EMP**
