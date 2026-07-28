import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, react, isOwner, sleep, jidToPhone } from "../utils.js";

export async function handleStealth(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;

  switch (command) {
    case "mimic": {
      if (!args) {
        await reply(sock, msg, "❌ Provide text to mimic.\nExample: `.mimic Hello everyone`");
        return true;
      }
      // Send as plain text that looks like it's from someone else
      const quoted = msg.message?.extendedTextMessage?.contextInfo;
      if (quoted?.participant) {
        await sock.sendMessage(
          jid,
          {
            text: args,
            mentions: [quoted.participant],
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(jid, { text: args });
        // Delete original command
        await sock.sendMessage(jid, { delete: msg.key });
      }
      return true;
    }

    case "ghosttag": {
      if (!jid.endsWith("@g.us")) {
        await reply(sock, msg, "❌ Group only.");
        return true;
      }
      const text = args || "‎";
      let groupMeta: any;
      try {
        groupMeta = await sock.groupMetadata(jid);
      } catch {
        return true;
      }
      const mentions = groupMeta.participants.map((p: any) => p.jid);
      // Send with invisible character so tag is hidden
      await sock.sendMessage(jid, { text: `\u200e${text}`, mentions });
      return true;
    }

    case "hidesend": {
      if (!args) {
        await reply(sock, msg, "❌ Provide message to send.\nExample: `.hidesend Hello`");
        return true;
      }
      // Delete user's command first, then send the message
      await sock.sendMessage(jid, { delete: msg.key });
      await sleep(500);
      await sock.sendMessage(jid, { text: args });
      return true;
    }

    case "trap": {
      // Set a fake admin-looking message trap
      if (!isOwner(sender)) {
        await reply(sock, msg, "❌ Owner only.");
        return true;
      }
      const trapText = args || "⚠️ *WARNING:* Group policy violation detected. All members have been flagged.";
      await sock.sendMessage(jid, { text: `*[ADMIN NOTICE]*\n\n${trapText}` });
      return true;
    }

    case "anonymous": {
      if (!args) {
        await reply(sock, msg, "❌ Provide message to send anonymously.");
        return true;
      }
      // Delete the command
      await sock.sendMessage(jid, { delete: msg.key });
      await sleep(300);
      await sock.sendMessage(jid, { text: `🎭 *Anonymous:*\n\n${args}` });
      return true;
    }

    case "steal": {
      // Steal a sticker / image and re-post
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        await reply(sock, msg, "❌ Quote a sticker or image to steal.");
        return true;
      }
      const { downloadMediaMessage } = await import("@whiskeysockets/baileys");
      if (quoted.stickerMessage) {
        try {
          const raw = await downloadMediaMessage(
            { message: quoted, key: msg.key } as any,
            "buffer",
            {}
          );
          await sock.sendMessage(jid, { sticker: Buffer.from(raw as ArrayBuffer) });
          await react(sock, msg, "✅");
        } catch {
          await reply(sock, msg, "❌ Steal failed.");
        }
      } else if (quoted.imageMessage) {
        try {
          const raw = await downloadMediaMessage(
            { message: quoted, key: msg.key } as any,
            "buffer",
            {}
          );
          await sock.sendMessage(jid, {
            image: Buffer.from(raw as ArrayBuffer),
            caption: args || "Stolen 👻",
          });
        } catch {
          await reply(sock, msg, "❌ Steal failed.");
        }
      } else {
        await reply(sock, msg, "❌ Only stickers and images can be stolen.");
      }
      return true;
    }

    default:
      return false;
  }
}
