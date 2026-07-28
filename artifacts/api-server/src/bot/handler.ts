import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { getBody, getCommand, getArgs, getSender, isGroup } from "./utils.js";
import { botSettings, shadowBanned } from "./state.js";
import { handleGeneral } from "./plugins/general.js";
import { handleGroups } from "./plugins/groups.js";
import { handleTools } from "./plugins/tools.js";
import { handleAI } from "./plugins/ai.js";
import { handleDownloader } from "./plugins/downloader.js";
import { handleStealth } from "./plugins/stealth.js";
import { handleThrone } from "./plugins/throne.js";
import { handleNuclear } from "./plugins/nuclear.js";
import { handleEconomy } from "./plugins/economy.js";
import { handleFun } from "./plugins/fun.js";
import { handleAnti, enforceAntiFeatures } from "./plugins/anti.js";
import { handleMode } from "./plugins/mode.js";
import { handleOwner } from "./plugins/owner.js";
import { logger } from "../lib/logger.js";

const plugins = [
  handleGeneral,
  handleGroups,
  handleTools,
  handleAI,
  handleDownloader,
  handleStealth,
  handleThrone,
  handleNuclear,
  handleEconomy,
  handleFun,
  handleAnti,
  handleMode,
  handleOwner,
];

/** Auto-reveal a view-once message and re-send without the view-once flag */
async function autoRevealViewOnce(sock: WASocket, msg: WAMessage): Promise<void> {
  try {
    const jid = msg.key.remoteJid!;
    // Baileys puts view-once content under these keys
    const vo =
      (msg.message as any)?.viewOnceMessage ||
      (msg.message as any)?.viewOnceMessageV2 ||
      (msg.message as any)?.viewOnceMessageV2Extension;

    if (!vo?.message) return;

    const inner = vo.message as Record<string, unknown>;
    // Strip the viewOnce flag from image/video if present
    const imgMsg = inner.imageMessage as any;
    const vidMsg = inner.videoMessage as any;
    if (imgMsg) imgMsg.viewOnce = false;
    if (vidMsg) vidMsg.viewOnce = false;

    // Try to download the media and re-send so it can be viewed indefinitely
    let buffer: Buffer | null = null;
    try {
      const raw = await downloadMediaMessage(
        { message: { ...vo.message }, key: msg.key } as any,
        "buffer",
        {}
      );
      buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
    } catch {
      // If download fails, forward the inner message directly
    }

    if (imgMsg && buffer) {
      await sock.sendMessage(
        jid,
        { image: buffer, caption: "👁️ *View-once revealed by Venom MD*" },
        { quoted: msg }
      );
    } else if (vidMsg && buffer) {
      await sock.sendMessage(
        jid,
        { video: buffer, caption: "👁️ *View-once revealed by Venom MD*" },
        { quoted: msg }
      );
    } else {
      // Fallback: forward the inner message object
      await sock.sendMessage(jid, inner as any, { quoted: msg });
    }
  } catch (err: any) {
    logger.debug({ err: err.message }, "Auto-vv failed");
  }
}

export async function handleMessage(sock: WASocket, msg: WAMessage): Promise<void> {
  try {
    if (!msg.message) return;
    if (msg.key.fromMe) return;

    const jid = msg.key.remoteJid!;
    if (!jid) return;

    const sender = getSender(msg);
    if (!sender) return;

    // ── Auto view-once reveal ────────────────────────────────────────────
    const isViewOnce =
      "viewOnceMessage" in msg.message ||
      "viewOnceMessageV2" in msg.message ||
      "viewOnceMessageV2Extension" in msg.message;
    if (isViewOnce) {
      await autoRevealViewOnce(sock, msg);
      // Don't return — still process commands if the body has a prefix
    }

    // Kill switch check
    if (process.env.KILLSWITCH === "1") return;

    // Shadow ban check
    if (shadowBanned.has(sender)) return;

    // Blocked user check
    if (botSettings.blockedUsers.has(sender)) return;

    // Auto-read
    if (botSettings.autoread) {
      await sock.readMessages([msg.key]);
    }

    // Auto-react
    if (botSettings.autoreact) {
      const emojis = ["❤️", "🔥", "👍", "😂", "🐍"];
      await sock.sendMessage(jid, {
        react: {
          text: emojis[Math.floor(Math.random() * emojis.length)],
          key: msg.key,
        },
      });
    }

    // Auto-typing / recording indicators
    if (botSettings.autotyping) await sock.sendPresenceUpdate("composing", jid);
    if (botSettings.autorecording) await sock.sendPresenceUpdate("recording", jid);

    const body = getBody(msg);
    const prefix = botSettings.prefix;

    // Enforce anti-features (runs before command check)
    if (isGroup(jid)) {
      const blocked = await enforceAntiFeatures(sock, msg, body, sender);
      if (blocked) return;
    }

    if (botSettings.autopresence) await sock.sendPresenceUpdate("available", jid);

    // Not a command — skip
    if (!body.startsWith(prefix)) return;

    // Self mode: only owner can use commands
    if (botSettings.mode === "self") {
      const { isOwner } = await import("./utils.js");
      if (!isOwner(sender)) return;
    }

    const command = getCommand(body, prefix);
    const args = getArgs(body, prefix);

    logger.info({ command, sender: sender.split("@")[0], jid: jid.split("@")[0] }, "Command received");

    // Try each plugin in order
    for (const plugin of plugins) {
      try {
        const handled = await plugin(sock, msg, command, args, sender);
        if (handled) break;
      } catch (err: any) {
        logger.error({ command, err: err.message }, "Plugin error");
        try {
          await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: msg });
        } catch {}
        break;
      }
    }
  } catch (err: any) {
    logger.error({ err: err.message }, "Handler error");
  }
}
