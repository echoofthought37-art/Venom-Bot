import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  Browsers,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger.js";
import { handleMessage } from "./handler.js";
import { BOT_CONFIG, SUPER_OWNER } from "./config.js";
import { getGroupSettings } from "./state.js";
import { exportSessionString, importSessionString, hasSession, saveSessionWithShortId } from "./session.js";

let sock: WASocket | null = null;
let pairingCode: string | null = null;
let connectionStatus: "connecting" | "open" | "close" | "pairing" = "connecting";

/** Phone number that requested a user pairing (non-owner self-hosting flow) */
let pendingPairPhone: string | null = null;

/** Short session ID generated after a successful pairing (e.g. VENOM_AB12CD34) */
let latestSessionId: string | null = null;

export function getSocket(): WASocket | null { return sock; }
export function getPairingCode(): string | null { return pairingCode; }
export function getConnectionStatus() { return connectionStatus; }
export function getLatestSessionId(): string | null { return latestSessionId; }
export function getPendingPairPhone(): string | null { return pendingPairPhone; }

export async function requestPairingCode(phoneNumber: string): Promise<string> {
  if (!sock) throw new Error("Bot not initialised");
  if (connectionStatus === "open") throw new Error("Bot is already connected");

  const cleaned = phoneNumber.replace(/[^0-9]/g, "");
  const code = await sock.requestPairingCode(cleaned);
  pairingCode = code;
  pendingPairPhone = cleaned;
  logger.info({ code, phone: cleaned }, "Pairing code generated for user");
  return code;
}

/** Send the short session ID to the user's own WhatsApp number */
async function sendSessionToUser(phone: string): Promise<void> {
  if (!sock) return;
  const sessionPath = path.resolve(BOT_CONFIG.sessionPath);

  try {
    const sessionId = await saveSessionWithShortId(sessionPath);
    latestSessionId = sessionId;
    const pairingSiteUrl = process.env.PAIRING_SITE_URL ?? "https://your-pairing-site.onrender.com";
    const jid = `${phone}@s.whatsapp.net`;

    const msg =
      `🐍 *VENOM MD — Your Session ID*\n\n` +
      `*${sessionId}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*To host your own bot:*\n\n` +
      `1. Fork the repo: github.com/TaprushEMP/venom-md\n` +
      `2. Go to render.com → New Web Service\n` +
      `3. Connect your fork\n` +
      `4. Add only *2 environment variables:*\n` +
      `   • SESSION_ID = *${sessionId}*\n` +
      `   • OWNER_NUMBER = _(your number e.g. 2349012345678)_\n` +
      `5. Click Deploy — your bot is live 24/7!\n\n` +
      `_Everything else is pre-configured for you._\n` +
      `_Powered by Taprush EMP_ 🐍`;

    await sock.sendMessage(jid, { text: msg });
    logger.info({ phone, sessionId }, "Session ID sent to user via WhatsApp");
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to send session ID to user");
  }
}

export async function startBot(): Promise<void> {
  const sessionPath = path.resolve(BOT_CONFIG.sessionPath);

  // ── Restore session from env vars if no local session exists ──────────────
  if (!hasSession(sessionPath)) {
    const sessionId = process.env.SESSION_ID;          // e.g. VENOM_AB12CD34
    const pairingSiteUrl = process.env.PAIRING_SITE_URL; // e.g. https://xyz.onrender.com
    const sessionString = process.env.SESSION_STRING;  // raw string (legacy fallback)

    if (sessionId && pairingSiteUrl) {
      // Preferred: fetch from pairing site using short ID
      logger.info({ sessionId }, "Fetching session from pairing site...");
      try {
        const { default: axios } = await import("axios");
        const res = await axios.get(`${pairingSiteUrl.replace(/\/$/, "")}/api/bot/session/${sessionId}`, { timeout: 15000 });
        await importSessionString(res.data.session, sessionPath);
        logger.info({ sessionId }, "Session restored from pairing site.");
      } catch (err: any) {
        logger.error({ err: err.message }, "Failed to fetch session by ID — starting fresh");
      }
    } else if (sessionString && sessionString.length > 20) {
      // Legacy: full session string in env var
      logger.info("Restoring session from SESSION_STRING...");
      try {
        await importSessionString(sessionString, sessionPath);
        logger.info("Session restored.");
      } catch (err: any) {
        logger.error({ err: err.message }, "Failed to restore session string — starting fresh");
      }
    }
  }

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  logger.info({ version }, "Starting Venom MD Bot");

  sock = makeWASocket({
    version,
    logger: logger.child({ module: "baileys" }) as any,
    printQRInTerminal: false,
    mobile: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  // ── Connection updates ──────────────────────────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "connecting") {
      connectionStatus = "connecting";
      logger.info("Connecting to WhatsApp...");

      if (!state.creds.registered) {
        connectionStatus = "pairing";
        logger.info("Not registered — auto-requesting pairing code for owner in 3s...");
        setTimeout(async () => {
          if (sock && !state.creds.registered) {
            try {
              const ownerNum = BOT_CONFIG.ownerNumber.replace(/[^0-9]/g, "");
              const code = await sock.requestPairingCode(ownerNum);
              pairingCode = code;
              pendingPairPhone = ownerNum;
              logger.info({ code }, `🔑 PAIRING CODE: ${code}`);
              console.log(`\n\n🐍 VENOM MD PAIRING CODE: ${code}\n\nEnter this code in WhatsApp > Linked Devices > Link a Device\n`);
            } catch (err: any) {
              logger.warn({ err: err.message }, "Auto pairing code request failed");
            }
          }
        }, 3000);
      }
    }

    if (connection === "open") {
      connectionStatus = "open";
      pairingCode = null;
      const botUser = sock?.user;
      logger.info("✅ Venom MD connected to WhatsApp!");
      console.log(`\n🐍 VENOM MD is ONLINE! Connected as ${botUser?.name ?? "unknown"}\n`);

      // ── Set bot profile picture on first connect ──────────────────────
      setTimeout(async () => {
        try {
          const { default: fs } = await import("fs");
          const { default: path } = await import("path");
          const iconPath = path.resolve("src/bot/assets/venom-bot-icon.png");
          if (fs.existsSync(iconPath)) {
            const buf = fs.readFileSync(iconPath);
            await sock!.updateProfilePicture(sock!.user!.id, buf);
            logger.info("🐍 Bot profile picture set.");
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, "Could not set bot profile picture");
        }
      }, 3000);

      // ── Send startup welcome to owner ──────────────────────────────────
      const ownerNum = BOT_CONFIG.ownerNumber.replace(/[^0-9]/g, "");
      const ownerJid = `${ownerNum}@s.whatsapp.net`;

      setTimeout(async () => {
        try {
          const uptime = new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" });
          await sock!.sendMessage(ownerJid, {
            text:
              `╔══════════════════════╗\n` +
              `║  🐍 *VENOM MD ONLINE*  ║\n` +
              `╚══════════════════════╝\n\n` +
              `✅ *Bot connected successfully!*\n\n` +
              `👤 *Connected as:* ${botUser?.name ?? "Venom MD"}\n` +
              `👑 *Owner:* ${ownerNum}\n` +
              `🔧 *Prefix:* \`${BOT_CONFIG.prefix}\`\n` +
              `⚙️ *Mode:* PUBLIC\n` +
              `🕐 *Time:* ${uptime}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n` +
              `💡 *Self-reply is ON* — type commands\n` +
              `   from your own WhatsApp anytime.\n\n` +
              `Type \`${BOT_CONFIG.prefix}menu\` to see all commands.\n\n` +
              `> 🐍 _Venom MD v2.0 | Taprush EMP_`,
          });
          logger.info({ ownerNum }, "Startup welcome sent to owner.");
        } catch (err: any) {
          logger.warn({ err: err.message }, "Could not send startup welcome to owner");
        }
      }, 5000);

      // If a user paired via the pairing site, send them their session ID
      if (pendingPairPhone) {
        const superNum = SUPER_OWNER.replace(/[^0-9]/g, "");

        setTimeout(() => {
          if (pendingPairPhone) {
            sendSessionToUser(pendingPairPhone);
            pendingPairPhone = null;
          }
        }, 8000);
      }
    }

    if (connection === "close") {
      connectionStatus = "close";
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logger.warn({ statusCode, shouldReconnect }, "Connection closed");

      if (shouldReconnect) {
        logger.info("Reconnecting in 5 seconds...");
        setTimeout(() => startBot(), 5000);
      } else {
        logger.warn("Logged out — clearing session and reconnecting");
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        setTimeout(() => startBot(), 5000);
      }
    }
  });

  // ── Credentials ─────────────────────────────────────────────────────────
  // Wrap saveCreds so it recreates the session folder if it was deleted at runtime
  sock.ev.on("creds.update", async () => {
    try {
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }
      await saveCreds();
    } catch (err: any) {
      logger.warn({ err: err.message }, "Could not save creds — session folder may have been deleted");
    }
  });

  // ── Messages ─────────────────────────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      await handleMessage(sock!, msg);
    }
  });

  // ── Group events (welcome / bye) ─────────────────────────────────────────
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    const settings = getGroupSettings(id);

    if (action === "add" && settings.welcome) {
      for (const jid of participants) {
        await sock!.sendMessage(id, {
          text: settings.welcome.replace("{user}", `@${jid.split("@")[0]}`),
          mentions: [jid],
        }).catch(() => {});
      }
    }

    if (action === "remove" && settings.bye) {
      for (const jid of participants) {
        await sock!.sendMessage(id, {
          text: settings.bye.replace("{user}", `@${jid.split("@")[0]}`),
          mentions: [jid],
        }).catch(() => {});
      }
    }
  });

  // ── Call reject (anti-call) ──────────────────────────────────────────────
  sock.ev.on("call", async (calls) => {
    for (const call of calls) {
      if (call.status === "offer") {
        await sock!.rejectCall(call.id, call.from).catch(() => {});
        logger.info({ jid: call.from }, "Call rejected (anti-call)");
      }
    }
  });
}
