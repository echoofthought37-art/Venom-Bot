import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, react, isOwner, isAdmin, isBotAdmin, jidToPhone, sleep } from "../utils.js";

export async function handleThrone(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;

  switch (command) {
    case "takeover": {
      if (!isOwner(sender)) {
        await reply(sock, msg, "❌ Owner only.");
        return true;
      }
      if (!jid.endsWith("@g.us")) {
        await reply(sock, msg, "❌ Group only.");
        return true;
      }
      let botJid = (sock.user?.id ?? "").split(":")[0] + "@s.whatsapp.net";
      let meta: any;
      try {
        meta = await sock.groupMetadata(jid);
      } catch {
        await reply(sock, msg, "❌ Could not fetch group info.");
        return true;
      }
      if (!isBotAdmin(meta.participants, botJid)) {
        await reply(sock, msg, "❌ I need to be an admin first.");
        return true;
      }
      // Promote owner, demote others
      const botOwnerJid = `${isOwner(sender) ? sender : botJid}`;
      const nonBotAdmins = meta.participants.filter(
        (p: any) =>
          p.admin === "admin" &&
          p.jid !== botJid &&
          !isOwner(p.jid)
      );
      for (const p of nonBotAdmins) {
        await sock.groupParticipantsUpdate(jid, [p.jid], "demote");
        await sleep(400);
      }
      await reply(sock, msg, "👑 *TAKEOVER COMPLETE!*\nAll rival admins have been demoted. 🐍");
      return true;
    }

    case "verify": {
      // Send a verification-style message
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      const target = mentioned[0];
      if (!target) {
        await reply(sock, msg, "❌ Mention someone to verify.");
        return true;
      }
      const text = `✅ *VERIFIED*\n\n@${jidToPhone(target)} has been verified as a legitimate member of this group.\n\n_Powered by Venom MD_`;
      await sock.sendMessage(jid, { text, mentions: [target] });
      return true;
    }

    case "forcejoin": {
      if (!isOwner(sender)) {
        await reply(sock, msg, "❌ Owner only.");
        return true;
      }
      if (!args) {
        await reply(sock, msg, "❌ Provide a group invite link.");
        return true;
      }
      const code = args.split("chat.whatsapp.com/").pop()?.trim() ?? args.trim();
      try {
        await sock.groupAcceptInvite(code);
        await reply(sock, msg, "✅ *Force joined* the group.");
      } catch {
        await reply(sock, msg, "❌ Could not join group.");
      }
      return true;
    }

    case "autoadmin": {
      if (!isOwner(sender)) {
        await reply(sock, msg, "❌ Owner only.");
        return true;
      }
      if (!jid.endsWith("@g.us")) {
        await reply(sock, msg, "❌ Group only.");
        return true;
      }
      let botJid = (sock.user?.id ?? "").split(":")[0] + "@s.whatsapp.net";
      let meta: any;
      try {
        meta = await sock.groupMetadata(jid);
      } catch {
        return true;
      }
      if (!isBotAdmin(meta.participants, botJid)) {
        await reply(sock, msg, "❌ I need to be an admin first.");
        return true;
      }
      const nonAdmins = meta.participants
        .filter((p: any) => !p.admin && p.jid !== botJid)
        .map((p: any) => p.jid);
      if (!nonAdmins.length) {
        await reply(sock, msg, "✅ Everyone is already an admin.");
        return true;
      }
      await reply(sock, msg, `⚡ Promoting ${nonAdmins.length} members...`);
      for (const p of nonAdmins) {
        await sock.groupParticipantsUpdate(jid, [p], "promote");
        await sleep(400);
      }
      await reply(sock, msg, "👑 *Auto-Admin complete!* All members promoted.");
      return true;
    }

    default:
      return false;
  }
}
