import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, isOwner, jidToPhone } from "../utils.js";
import { getEconomyUser, userEconomy } from "../state.js";

const DAILY_REWARD = 500;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

function getLevelTitle(level: number): string {
  const titles = [
    "🥚 Rookie",
    "🐣 Newbie",
    "🐍 Serpent",
    "🗡️ Blade",
    "⚔️ Warrior",
    "💀 Shadow",
    "☠️ Phantom",
    "👑 King",
    "🔱 God",
    "🐉 Legend",
  ];
  return titles[Math.min(level - 1, titles.length - 1)] ?? "🐉 Legend";
}

function getXPForLevel(level: number): number {
  return level * 500;
}

export async function handleEconomy(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;
  const user = getEconomyUser(sender);

  switch (command) {
    case "profile":
    case "bal":
    case "balance": {
      const level = user.level;
      const xpNeeded = getXPForLevel(level);
      const profile = `╔══════════════════╗
║  🐍 *VENOM PROFILE*  ║
╚══════════════════╝

👤 *User:* @${jidToPhone(sender)}
🏆 *Level:* ${level} — ${getLevelTitle(level)}
📊 *XP:* ${user.xp}/${xpNeeded}
💰 *Coins:* ${user.coins.toLocaleString()}
⭐ *Premium:* ${user.premium ? "YES ✅" : "NO ❌"}`;
      await sock.sendMessage(jid, { text: profile, mentions: [sender] });
      return true;
    }

    case "daily": {
      const now = Date.now();
      const diff = now - user.lastDaily;
      if (diff < DAILY_COOLDOWN) {
        const remaining = DAILY_COOLDOWN - diff;
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        await reply(sock, msg, `⏳ *Daily cooldown active*\nCome back in *${h}h ${m}m*`);
        return true;
      }
      const bonus = user.premium ? DAILY_REWARD * 2 : DAILY_REWARD;
      user.coins += bonus;
      user.xp += 100;
      user.lastDaily = now;
      // Level up check
      while (user.xp >= getXPForLevel(user.level)) {
        user.xp -= getXPForLevel(user.level);
        user.level++;
      }
      await reply(
        sock,
        msg,
        `💰 *Daily Reward!*\n\n+${bonus.toLocaleString()} coins ${user.premium ? "(Premium 2x! ⭐)" : ""}\n+100 XP\n\n💰 Balance: ${user.coins.toLocaleString()}\n🏆 Level: ${user.level}`
      );
      return true;
    }

    case "top":
    case "leaderboard": {
      const sorted = [...userEconomy.entries()]
        .sort(([, a], [, b]) => b.coins - a.coins)
        .slice(0, 10);
      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = sorted.map(([jid2, u], i) => {
        return `${medals[i]} *${jidToPhone(jid2)}* — ${u.coins.toLocaleString()} coins (Lv.${u.level})`;
      });
      await reply(sock, msg, `🏆 *TOP 10 RICHEST*\n\n${lines.join("\n")}`);
      return true;
    }

    case "transfer":
    case "send": {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      const target = mentioned[0];
      const amount = parseInt(args.match(/\d+/)?.[0] ?? "0");
      if (!target || amount <= 0) {
        await reply(sock, msg, "❌ Usage: `.transfer @user 500`");
        return true;
      }
      if (amount > user.coins) {
        await reply(sock, msg, `❌ Insufficient coins. You have *${user.coins.toLocaleString()}*.`);
        return true;
      }
      const targetUser = getEconomyUser(target);
      user.coins -= amount;
      targetUser.coins += amount;
      await sock.sendMessage(
        jid,
        {
          text: `💸 *Transfer Complete!*\n\n@${jidToPhone(sender)} → @${jidToPhone(target)}\n💰 Amount: ${amount.toLocaleString()} coins`,
          mentions: [sender, target],
        }
      );
      return true;
    }

    case "premium": {
      if (!isOwner(sender)) {
        await reply(sock, msg, "❌ Owner only. Premium is granted by the bot owner.");
        return true;
      }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      const target = mentioned[0];
      if (!target) {
        await reply(sock, msg, "❌ Mention someone to grant premium.");
        return true;
      }
      const targetUser = getEconomyUser(target);
      targetUser.premium = !targetUser.premium;
      await sock.sendMessage(
        jid,
        {
          text: `⭐ *Premium ${targetUser.premium ? "GRANTED" : "REVOKED"}!*\n\n@${jidToPhone(target)} is ${targetUser.premium ? "now" : "no longer"} a premium user.`,
          mentions: [target],
        }
      );
      return true;
    }

    default:
      return false;
  }
}
