import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import {
  reply,
  isOwner,
  isAdmin,
  isBotAdmin,
  getSender,
  phoneToJid,
  jidToPhone,
  getMentioned,
  sleep,
} from "../utils.js";
import { getGroupSettings } from "../state.js";

export async function handleGroups(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;
  if (!jid.endsWith("@g.us")) return false;

  let groupMeta: Awaited<ReturnType<typeof sock.groupMetadata>> | null = null;
  let participants: typeof groupMeta.participants = [];
  let botJid = sock.user?.id ?? "";
  // Normalize bot jid (remove device part)
  botJid = botJid.split(":")[0] + "@s.whatsapp.net";

  try {
    groupMeta = await sock.groupMetadata(jid);
    participants = groupMeta.participants;
  } catch {
    await reply(sock, msg, "❌ Could not fetch group info.");
    return true;
  }

  const isAdminUser = isAdmin(participants, sender);
  const isBotAdminUser = isBotAdmin(participants, botJid);
  const isOwnerUser = isOwner(sender);

  const requireAdmin = async () => {
    if (!isAdminUser && !isOwnerUser) {
      await reply(sock, msg, "❌ This command is for *admins* only.");
      return false;
    }
    return true;
  };
  const requireBotAdmin = async () => {
    if (!isBotAdminUser) {
      await reply(sock, msg, "❌ Make me an *admin* first.");
      return false;
    }
    return true;
  };

  const settings = getGroupSettings(jid);

  switch (command) {
    case "kick": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      const quotedParticipant =
        msg.message?.extendedTextMessage?.contextInfo?.participant;
      const targets =
        mentioned.length > 0
          ? mentioned
          : quotedParticipant
          ? [quotedParticipant]
          : [];
      if (targets.length === 0) {
        await reply(sock, msg, "❌ Mention or quote someone to kick.");
        return true;
      }
      for (const t of targets) {
        if (isOwner(t)) {
          await reply(sock, msg, "❌ Cannot kick the owner.");
          continue;
        }
        await sock.groupParticipantsUpdate(jid, [t], "remove");
      }
      await reply(sock, msg, `✅ Kicked ${targets.length} member(s).`);
      return true;
    }

    case "add": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      if (!args) {
        await reply(sock, msg, "❌ Provide a number to add.\nExample: `.add 2348012345678`");
        return true;
      }
      const numJid = phoneToJid(args.trim());
      await sock.groupParticipantsUpdate(jid, [numJid], "add");
      await reply(sock, msg, `✅ Added *${jidToPhone(numJid)}*`);
      return true;
    }

    case "promote": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) {
        await reply(sock, msg, "❌ Mention someone to promote.");
        return true;
      }
      await sock.groupParticipantsUpdate(jid, mentioned, "promote");
      await reply(sock, msg, `⬆️ Promoted ${mentioned.length} member(s).`);
      return true;
    }

    case "demote": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) {
        await reply(sock, msg, "❌ Mention someone to demote.");
        return true;
      }
      await sock.groupParticipantsUpdate(jid, mentioned, "demote");
      await reply(sock, msg, `⬇️ Demoted ${mentioned.length} member(s).`);
      return true;
    }

    case "tagall": {
      if (!(await requireAdmin())) return true;
      const text = args || "🔔 Attention everyone!";
      const mentions = participants.map((p) => p.jid!);
      const body =
        `📢 *${text}*\n\n` + mentions.map((m) => `@${jidToPhone(m)}`).join(" ");
      await sock.sendMessage(jid, { text: body, mentions });
      return true;
    }

    case "hidetag": {
      if (!(await requireAdmin())) return true;
      const text = args || "‎"; // invisible char
      const mentions = participants.map((p) => p.jid!);
      await sock.sendMessage(jid, { text, mentions });
      return true;
    }

    case "link": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      try {
        const code = await sock.groupInviteCode(jid);
        await reply(sock, msg, `🔗 *Group Link:*\nhttps://chat.whatsapp.com/${code}`);
      } catch {
        await reply(sock, msg, "❌ Could not get invite link.");
      }
      return true;
    }

    case "revoke": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      try {
        await sock.groupRevokeInvite(jid);
        await reply(sock, msg, "✅ Group link revoked. A new link has been generated.");
      } catch {
        await reply(sock, msg, "❌ Could not revoke link.");
      }
      return true;
    }

    case "kickall": {
      if (!isOwnerUser && !isAdminUser) {
        await reply(sock, msg, "❌ Owner/Admin only.");
        return true;
      }
      if (!(await requireBotAdmin())) return true;
      const nonAdmins = participants.filter(
        (p) => p.admin == null && p.jid !== botJid && !isOwner(p.jid!)
      );
      if (!nonAdmins.length) {
        await reply(sock, msg, "✅ No non-admins to kick.");
        return true;
      }
      await reply(sock, msg, `⚠️ Kicking ${nonAdmins.length} members...`);
      for (const p of nonAdmins) {
        await sock.groupParticipantsUpdate(jid, [p.jid!], "remove");
        await sleep(500);
      }
      await reply(sock, msg, "✅ Done! All non-admins kicked.");
      return true;
    }

    case "lockdown": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      const sub = args.toLowerCase();
      if (sub === "on") {
        settings.lockdown = true;
        await sock.groupSettingUpdate(jid, "announcement");
        await reply(sock, msg, "🔒 *Lockdown ON* — only admins can send messages.");
      } else if (sub === "off") {
        settings.lockdown = false;
        await sock.groupSettingUpdate(jid, "not_announcement");
        await reply(sock, msg, "🔓 *Lockdown OFF* — all members can send messages.");
      } else {
        await reply(sock, msg, "Usage: `.lockdown on/off`");
      }
      return true;
    }

    case "setwelcome": {
      if (!(await requireAdmin())) return true;
      if (!args) {
        settings.welcome = null;
        await reply(sock, msg, "✅ Welcome message disabled.");
      } else {
        settings.welcome = args;
        await reply(sock, msg, `✅ Welcome message set:\n\n${args}`);
      }
      return true;
    }

    case "setbye": {
      if (!(await requireAdmin())) return true;
      if (!args) {
        settings.bye = null;
        await reply(sock, msg, "✅ Goodbye message disabled.");
      } else {
        settings.bye = args;
        await reply(sock, msg, `✅ Goodbye message set:\n\n${args}`);
      }
      return true;
    }

    case "setname": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      if (!args) {
        await reply(sock, msg, "❌ Provide a new group name.");
        return true;
      }
      await sock.groupUpdateSubject(jid, args);
      await reply(sock, msg, `✅ Group name set to: *${args}*`);
      return true;
    }

    case "setdesc": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      if (!args) {
        await reply(sock, msg, "❌ Provide a new description.");
        return true;
      }
      await sock.groupUpdateDescription(jid, args);
      await reply(sock, msg, "✅ Group description updated.");
      return true;
    }

    case "members": {
      const lines = participants.map((p, i) => {
        const role = p.admin === "superadmin" ? "👑" : p.admin === "admin" ? "⭐" : "👤";
        return `${i + 1}. ${role} ${jidToPhone(p.jid!)}`;
      });
      await reply(
        sock,
        msg,
        `👥 *Group Members (${participants.length})*\n\n${lines.join("\n")}`
      );
      return true;
    }

    case "group": {
      if (!(await requireAdmin())) return true;
      if (!(await requireBotAdmin())) return true;
      const sub = args.toLowerCase();
      if (sub === "open") {
        await sock.groupSettingUpdate(jid, "not_announcement");
        await reply(sock, msg, "🔓 Group is now *OPEN* — anyone can send.");
      } else if (sub === "close") {
        await sock.groupSettingUpdate(jid, "announcement");
        await reply(sock, msg, "🔒 Group is now *CLOSED* — admins only.");
      } else {
        await reply(sock, msg, "Usage: `.group open` or `.group close`");
      }
      return true;
    }

    case "warn": {
      if (!(await requireAdmin())) return true;
      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      const target =
        mentioned[0] ||
        msg.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target) {
        await reply(sock, msg, "❌ Mention someone to warn.");
        return true;
      }
      if (!settings.warn[target]) settings.warn[target] = 0;
      settings.warn[target]++;
      const warnCount = settings.warn[target];
      await reply(
        sock,
        msg,
        `⚠️ @${jidToPhone(target)} has been warned.\n*Warnings: ${warnCount}/3*\n${
          warnCount >= 3 ? "🚨 Limit reached — kicking!" : ""
        }`,
      );
      if (warnCount >= 3 && isBotAdminUser) {
        await sock.groupParticipantsUpdate(jid, [target], "remove");
        settings.warn[target] = 0;
      }
      return true;
    }

    default:
      return false;
  }
}
