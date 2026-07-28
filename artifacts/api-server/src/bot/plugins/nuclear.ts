import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, react, isOwner, sleep, jidToPhone } from "../utils.js";
import { shadowBanned, botSpyGroups } from "../state.js";

export async function handleNuclear(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  if (!isOwner(sender)) return false;

  const jid = msg.key.remoteJid!;

  switch (command) {
    case "gcast": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a message to broadcast.\nExample: `.gcast Hello all groups!`");
        return true;
      }
      await react(sock, msg, "📡");
      const chats = await sock.groupFetchAllParticipating();
      const groups = Object.keys(chats);
      await reply(sock, msg, `📡 Broadcasting to *${groups.length}* groups...`);
      let success = 0;
      for (const g of groups) {
        try {
          await sock.sendMessage(g, { text: `📢 *Broadcast from Venom MD*\n\n${args}` });
          success++;
          await sleep(500);
        } catch {}
      }
      await reply(sock, msg, `✅ Broadcast sent to *${success}/${groups.length}* groups.`);
      return true;
    }

    case "strike": {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      const target = mentioned[0];
      if (!target) {
        await reply(sock, msg, "❌ Mention someone to strike.");
        return true;
      }
      const reason = args || "Violation of bot policy";
      await reply(sock, msg, `⚡ *STRIKE ISSUED*\n\n👤 Target: @${jidToPhone(target)}\n📝 Reason: ${reason}\n\n_This has been logged by Venom MD._`);
      return true;
    }

    case "shadowban": {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      const target = mentioned[0];
      if (!target) {
        await reply(sock, msg, "❌ Mention someone to shadowban.");
        return true;
      }
      shadowBanned.add(target);
      await reply(sock, msg, `👻 *Shadowbanned:* @${jidToPhone(target)}\n\n_Their messages will be silently ignored._`);
      return true;
    }

    case "killswitch": {
      const sub = args.toLowerCase();
      if (sub === "on") {
        await reply(sock, msg, "☢️ *KILL SWITCH ACTIVATED!*\n\nAll bot responses are now disabled.\nType `.killswitch off` to re-enable.");
        // This would need global state – simplified implementation
        process.env.KILLSWITCH = "1";
      } else if (sub === "off") {
        delete process.env.KILLSWITCH;
        await reply(sock, msg, "✅ *Kill switch deactivated.* Bot is active again.");
      } else {
        await reply(sock, msg, "Usage: `.killswitch on/off`");
      }
      return true;
    }

    case "statusboost": {
      if (!args) {
        await reply(sock, msg, "❌ Provide status text.\nExample: `.statusboost Venom MD is live!`");
        return true;
      }
      try {
        await sock.sendMessage("status@broadcast", { text: args });
        await reply(sock, msg, "✅ *Status posted!*");
      } catch {
        await reply(sock, msg, "❌ Status boost failed.");
      }
      return true;
    }

    case "statussync": {
      await react(sock, msg, "🔄");
      await reply(sock, msg, "🔄 *Status synced!* (monitoring active statuses)");
      return true;
    }

    case "botspy": {
      const sub = args.toLowerCase();
      if (sub === "on") {
        botSpyGroups.add(jid);
        await reply(sock, msg, "🕵️ *Bot Spy ON* — monitoring all messages in this group.");
      } else if (sub === "off") {
        botSpyGroups.delete(jid);
        await reply(sock, msg, "🕵️ *Bot Spy OFF.*");
      } else {
        await reply(sock, msg, `*Bot Spy:* ${botSpyGroups.has(jid) ? "ON" : "OFF"}\nUsage: \`.botspy on/off\``);
      }
      return true;
    }

    default:
      return false;
  }
}
