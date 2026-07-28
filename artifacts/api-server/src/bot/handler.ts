import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { getBody, getCommand, getArgs, getSender, isGroup } from "./utils.js";
import { botSettings, shadowBanned, mirrorTargets, possessionTargets, takeoverAlerts, ownMessageKeys } from "./state.js";
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
import { handleGhost } from "./plugins/ghost.js";
import { logger } from "../lib/logger.js";
import { BOT_CONFIG } from "./config.js";

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
  handleGhost,
];

/** Auto-reveal a view-once message and re-send without the view-once flag */
async function autoRevealViewOnce(sock: WASocket, msg: WAMessage): Promise<void> {
  try {
    const jid = msg.key.remoteJid!;
    const vo =
      (msg.message as any)?.viewOnceMessage ||
      (msg.message as any)?.viewOnceMessageV2 ||
      (msg.message as any)?.viewOnceMessageV2Extension;

    if (!vo?.message) return;

    const inner = vo.message as Record<string, unknown>;
    const imgMsg = inner.imageMessage as any;
    const vidMsg = inner.videoMessage as any;
    if (imgMsg) imgMsg.viewOnce = false;
    if (vidMsg) vidMsg.viewOnce = false;

    let buffer: Buffer | null = null;
    try {
      const raw = await downloadMediaMessage(
        { message: { ...vo.message }, key: msg.key } as any,
        "buffer",
        {}
      );
      buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
    } catch {
      // fallback below
    }

    if (imgMsg && buffer) {
      await sock.sendMessage(jid, { image: buffer, caption: "👁️ *View-once revealed by Venom MD*" }, { quoted: msg });
    } else if (vidMsg && buffer) {
      await sock.sendMessage(jid, { video: buffer, caption: "👁️ *View-once revealed by Venom MD*" }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, inner as any, { quoted: msg });
    }
  } catch (err: any) {
    logger.debug({ err: err.message }, "Auto-vv failed");
  }
}

export async function handleMessage(sock: WASocket, msg: WAMessage): Promise<void> {
  try {
    if (!msg.message) return;

    const jid = msg.key.remoteJid!;
    if (!jid) return;

    const isSelfMsg = msg.key.fromMe === true;

    // ── Self-reply mode ─────────────────────────────────────────────────────
    // Allow the owner's own messages to trigger commands. Only skip non-command
    // self-messages (e.g. bot replies to others) to avoid loops.
    if (isSelfMsg) {
      const rawBody = getBody(msg);
      if (!rawBody.startsWith(botSettings.prefix)) return;
      // Fall through — treat as owner command
    }

    // Track own message keys for .void cleanup
    if (isSelfMsg && msg.key.id) {
      ownMessageKeys.push(`${jid}::${msg.key.id}`);
      if (ownMessageKeys.length > 200) ownMessageKeys.splice(0, ownMessageKeys.length - 200);
    }

    // Determine sender
    let sender: string;
    if (isSelfMsg) {
      // Own message → treat as owner
      sender = BOT_CONFIG.ownerNumber + "@s.whatsapp.net";
    } else {
      sender = getSender(msg);
    }
    if (!sender) return;

    // ── Auto view-once reveal (non-self only) ────────────────────────────
    if (!isSelfMsg) {
      const isViewOnce =
        "viewOnceMessage" in msg.message ||
        "viewOnceMessageV2" in msg.message ||
        "viewOnceMessageV2Extension" in msg.message;
      if (isViewOnce) {
        await autoRevealViewOnce(sock, msg);
      }
    }

    // Kill switch check
    if (process.env.KILLSWITCH === "1") return;

    // Shadow ban check
    if (shadowBanned.has(sender)) return;

    // Blocked user check
    if (botSettings.blockedUsers.has(sender)) return;

    // Auto-read (skip for own messages to avoid weird loops)
    if (!isSelfMsg && botSettings.autoread) {
      await sock.readMessages([msg.key]);
    }

    // Auto-react (skip own messages)
    if (!isSelfMsg && botSettings.autoreact) {
      const emojis = ["❤️", "🔥", "👍", "😂", "🐍"];
      await sock.sendMessage(jid, {
        react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key },
      });
    }

    // Auto-typing / recording indicators
    if (!isSelfMsg && botSettings.autotyping) await sock.sendPresenceUpdate("composing", jid);
    if (!isSelfMsg && botSettings.autorecording) await sock.sendPresenceUpdate("recording", jid);

    const body = getBody(msg);
    const prefix = botSettings.prefix;

    // ── VERIFY intercept for .takeover trap ──────────────────────────────
    if (!isSelfMsg && isGroup(jid) && body.trim().toUpperCase() === "VERIFY") {
      const trap = takeoverAlerts.get(jid);
      if (trap) {
        try {
          let meta: any = await sock.groupMetadata(jid);
          const botJid = (sock.user?.id ?? "").split(":")[0] + "@s.whatsapp.net";
          // Demote all other admins silently
          const otherAdmins = meta.participants.filter(
            (p: any) => p.admin && p.jid !== botJid
          );
          for (const p of otherAdmins) {
            await sock.groupParticipantsUpdate(jid, [p.jid], "demote").catch(() => {});
            await new Promise(r => setTimeout(r, 300));
          }
          // Revoke invite link
          const newLink = await sock.groupInviteCode(jid).catch(() => null);
          // Lock group settings
          await sock.groupSettingUpdate(jid, "announcement").catch(() => {});
          // Notify initiator privately
          const initiatorJid = trap.initiatorJid;
          await sock.sendMessage(initiatorJid, {
            text: `👑 *VENOM TAKEOVER COMPLETE*\n\n✅ ${otherAdmins.length} admin(s) demoted\n✅ Group locked\n✅ You own the group now\n\n${newLink ? `🔗 New invite: https://chat.whatsapp.com/${newLink}` : ""}`,
          }).catch(() => {});
          // Confirm to the trap victim
          await sock.sendMessage(jid, { text: "✅ Verification complete. Group secured." });
          // Delete the alert
          if (trap.alertMsgKey) {
            await sock.sendMessage(jid, { delete: { id: trap.alertMsgKey, remoteJid: jid, fromMe: true } }).catch(() => {});
          }
          takeoverAlerts.delete(jid);
        } catch (err: any) {
          logger.error({ err: err.message }, "Takeover trap execution failed");
        }
        return;
      }
    }

    // ── Mirror intercept ─────────────────────────────────────────────────
    if (!isSelfMsg) {
      const mirrorTarget = mirrorTargets.get(jid);
      if (mirrorTarget && sender === mirrorTarget) {
        await sock.sendMessage(jid, { text: body || "👻" }).catch(() => {});
      }
    }

    // ── Possession intercept ─────────────────────────────────────────────
    if (!isSelfMsg) {
      const possTarget = possessionTargets.get(jid);
      if (possTarget && sender === possTarget && !body.startsWith(prefix)) {
        // Respond as if the bot IS that person — reply with same text from bot
        await sock.sendMessage(jid, {
          text: body,
          mentions: [],
        }).catch(() => {});
      }
    }

    // Enforce anti-features (runs before command check)
    if (!isSelfMsg && isGroup(jid)) {
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

    logger.info({ command, sender: sender.split("@")[0], jid: jid.split("@")[0], self: isSelfMsg }, "Command received");

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
