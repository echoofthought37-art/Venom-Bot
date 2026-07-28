import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, isOwner, phoneToJid, sleep } from "../utils.js";
import { botSettings } from "../state.js";
import fs from "fs";
import path from "path";
import { BOT_CONFIG } from "../config.js";

export async function handleOwner(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  if (!isOwner(sender)) return false;

  const jid = msg.key.remoteJid!;

  switch (command) {
    case "setprefix": {
      if (!args || args.length > 3) {
        await reply(sock, msg, "❌ Provide 1-3 characters as prefix.");
        return true;
      }
      botSettings.prefix = args.trim();
      await reply(sock, msg, `✅ Prefix changed to \`${args.trim()}\``);
      return true;
    }

    case "block": {
      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length && !args) {
        await reply(sock, msg, "❌ Mention someone to block.");
        return true;
      }
      const targets = mentioned.length
        ? mentioned
        : [phoneToJid(args.trim())];
      for (const t of targets) {
        await sock.updateBlockStatus(t, "block");
        botSettings.blockedUsers.add(t);
      }
      await reply(sock, msg, `🚫 Blocked ${targets.length} user(s).`);
      return true;
    }

    case "unblock": {
      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length && !args) {
        await reply(sock, msg, "❌ Mention someone to unblock.");
        return true;
      }
      const targets = mentioned.length
        ? mentioned
        : [phoneToJid(args.trim())];
      for (const t of targets) {
        await sock.updateBlockStatus(t, "unblock");
        botSettings.blockedUsers.delete(t);
      }
      await reply(sock, msg, `✅ Unblocked ${targets.length} user(s).`);
      return true;
    }

    case "join": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a group invite link.");
        return true;
      }
      const code = args.split("chat.whatsapp.com/").pop()?.trim() ?? args.trim();
      try {
        await sock.groupAcceptInvite(code);
        await reply(sock, msg, "✅ Joined group successfully.");
      } catch {
        await reply(sock, msg, "❌ Failed to join group.");
      }
      return true;
    }

    case "leave": {
      const targetJid = args.trim() || jid;
      await reply(sock, msg, `👋 Leaving group...`);
      await sleep(1000);
      await sock.groupLeave(targetJid);
      return true;
    }

    case "eval": {
      if (!args) {
        await reply(sock, msg, "❌ Provide code to evaluate.");
        return true;
      }
      try {
        const result = eval(args);
        const output = JSON.stringify(result, null, 2) ?? String(result);
        await reply(sock, msg, `✅ Result:\n\`\`\`\n${output.slice(0, 3000)}\n\`\`\``);
      } catch (e: any) {
        await reply(sock, msg, `❌ Error:\n${e.message}`);
      }
      return true;
    }

    case "restart": {
      await reply(sock, msg, "🔄 Restarting Venom MD...");
      await sleep(2000);
      process.exit(0);
    }

    case "setbotname": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a new bot name.");
        return true;
      }
      await sock.updateProfileName(args);
      await reply(sock, msg, `✅ Bot name set to: *${args}*`);
      return true;
    }

    case "setbotbio": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a new bio.");
        return true;
      }
      await sock.updateProfileStatus(args);
      await reply(sock, msg, `✅ Bot bio updated.`);
      return true;
    }

    case "setbotpp": {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) {
        await reply(sock, msg, "❌ Quote an image to set as profile picture.");
        return true;
      }
      try {
        const { downloadMediaMessage } = await import("@whiskeysockets/baileys");
        const buffer = await downloadMediaMessage(
          { message: quoted, key: msg.key },
          "buffer",
          {}
        );
        await sock.updateProfilePicture(sock.user!.id, buffer as Buffer);
        await reply(sock, msg, "✅ Bot profile picture updated!");
      } catch {
        await reply(sock, msg, "❌ Failed to update profile picture.");
      }
      return true;
    }

    case "install":
    case "uninstall": {
      await reply(
        sock,
        msg,
        "⚠️ Plugin management is not yet implemented. Restart the bot after adding plugins."
      );
      return true;
    }

    default:
      return false;
  }
}
