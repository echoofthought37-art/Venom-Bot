import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import os from "os";
import { reply, isOwner } from "../utils.js";
import { BOT_CONFIG } from "../config.js";
import { groupSettings, userEconomy, botSettings } from "../state.js";

const startTime = Date.now();

export async function handleGeneral(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;

  switch (command) {
    case "menu":
    case "help": {
      const prefix = botSettings.prefix;
      const menuText = `╔══════════════════════╗
║   🐍 *VENOM MD v2.0*  ║
║   _by Taprush EMP_    ║
╚══════════════════════╝

━━━ 🐍 *GENERAL* ━━━
${prefix}menu • ${prefix}ping • ${prefix}info • ${prefix}runtime • ${prefix}stats • ${prefix}alive

━━━ 👥 *GROUP MANAGEMENT* ━━━
${prefix}kick • ${prefix}add • ${prefix}promote • ${prefix}demote • ${prefix}tagall
${prefix}hidetag • ${prefix}link • ${prefix}revoke • ${prefix}kickall • ${prefix}lockdown
${prefix}setwelcome • ${prefix}setbye • ${prefix}setname • ${prefix}setdesc
${prefix}setppgc • ${prefix}members • ${prefix}group open/close • ${prefix}warn

━━━ 🛠️ *TOOLS* ━━━
${prefix}sticker • ${prefix}toimg • ${prefix}vv • ${prefix}antidelete
${prefix}trt • ${prefix}ss • ${prefix}short • ${prefix}tovn
${prefix}wiki • ${prefix}weather • ${prefix}tomp3 • ${prefix}tomp4 • ${prefix}take

━━━ 🤖 *AI* ━━━
${prefix}ai • ${prefix}dalle • ${prefix}enhance • ${prefix}removebg • ${prefix}mimicvoice

━━━ 📥 *DOWNLOADER* ━━━
${prefix}ytmp3 • ${prefix}ytmp4 • ${prefix}tiktok • ${prefix}ig • ${prefix}fb • ${prefix}apk

━━━ 👻 *GHOST MODE* (Owner) ━━━
${prefix}ghoston • ${prefix}ghostoff • ${prefix}ghostmsg • ${prefix}blackmsg • ${prefix}empty

━━━ 🕶️ *INVISIBLE TAG* (Owner) ━━━
${prefix}shadow • ${prefix}silenttag • ${prefix}hidemen

━━━ 💨 *VANISH* (Owner) ━━━
${prefix}vanish • ${prefix}void

━━━ 🔇 *SILENT ADMIN OPS* (Owner) ━━━
${prefix}silentkick • ${prefix}silentadd • ${prefix}silentpromote • ${prefix}silentdemote
${prefix}silentdemoteall • ${prefix}sweep • ${prefix}coup

━━━ 👑 *GHOST ADMIN POWERS* (Owner) ━━━
${prefix}ghostadmin • ${prefix}shadowowner • ${prefix}blindkick • ${prefix}blindban

━━━ 🎭 *IDENTITY MANIPULATION* (Owner) ━━━
${prefix}impersonate • ${prefix}fakequote • ${prefix}mirror • ${prefix}unmirror
${prefix}possession • ${prefix}unpossess

━━━ 👥 *CLONE SYSTEM* (Owner) ━━━
${prefix}clonedp • ${prefix}clonebio • ${prefix}clonename • ${prefix}cloneall • ${prefix}revert

━━━ 🎨 *SILENT GROUP CHANGES* (Owner) ━━━
${prefix}silentgcname • ${prefix}silentgcdesc • ${prefix}silentgcicon
${prefix}silentlock • ${prefix}silentunlock • ${prefix}silentsettings

━━━ 💀 *TAKEOVER SYSTEM* (Owner) ━━━
${prefix}security • ${prefix}claim • ${prefix}cover • ${prefix}expose

━━━ 👻 *STEALTH SYSTEM* (Owner) ━━━
${prefix}stealth • ${prefix}unstealth • ${prefix}silentread

━━━ 💣 *SPECIAL ATTACKS* (Owner) ━━━
${prefix}phantombomb • ${prefix}bomb

━━━ 🛡️ *THRONE* (Owner) ━━━
${prefix}takeover • ${prefix}verify • ${prefix}forcejoin • ${prefix}autoadmin

━━━ ☢️ *NUCLEAR* (Owner) ━━━
${prefix}gcast • ${prefix}strike • ${prefix}shadowban
${prefix}killswitch • ${prefix}statusboost • ${prefix}statussync • ${prefix}botspy

━━━ 💰 *ECONOMY* ━━━
${prefix}profile • ${prefix}top • ${prefix}daily • ${prefix}transfer • ${prefix}premium

━━━ 🎮 *FUN* ━━━
${prefix}roast • ${prefix}joke • ${prefix}quote • ${prefix}ship
${prefix}8ball • ${prefix}dare • ${prefix}trivia

━━━ 🛡️ *ANTI FEATURES* ━━━
${prefix}antilink • ${prefix}antibot • ${prefix}antispam • ${prefix}anticall
${prefix}antipv • ${prefix}antifake • ${prefix}antiraid • ${prefix}antinsfw
${prefix}antibadword • ${prefix}antivv

━━━ ⚙️ *MODE SETTINGS* ━━━
${prefix}self • ${prefix}public • ${prefix}autotyping • ${prefix}autorecording
${prefix}autoread • ${prefix}autoreact • ${prefix}autopresence

━━━ 🔧 *OWNER ONLY* ━━━
${prefix}setprefix • ${prefix}block • ${prefix}unblock • ${prefix}join • ${prefix}leave
${prefix}eval • ${prefix}restart • ${prefix}setbotname • ${prefix}setbotpp • ${prefix}setbotbio

> 🐍 *Venom MD* | Made by *Taprush EMP*
> 💡 _Self-reply enabled — type commands from your own WA_`;

      await reply(sock, msg, menuText);
      return true;
    }

    case "alive": {
      const uptime = Date.now() - startTime;
      const s = Math.floor(uptime / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      const uptimeStr = d > 0 ? `${d}d ${h % 24}h ${m % 60}m` : h > 0 ? `${h}h ${m % 60}m ${s % 60}s` : `${m}m ${s % 60}s`;
      await reply(
        sock,
        msg,
        `╔══════════════════════╗\n` +
        `║   🐍 *VENOM MD ALIVE*  ║\n` +
        `╚══════════════════════╝\n\n` +
        `✅ *Bot is online and ready!*\n\n` +
        `🤖 *Name:* ${BOT_CONFIG.name}\n` +
        `👑 *Owner:* @${BOT_CONFIG.ownerNumber}\n` +
        `⏱️ *Uptime:* ${uptimeStr}\n` +
        `💾 *RAM:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
        `⚡ *Ping:* ${Date.now() - (msg.messageTimestamp as number) * 1000}ms\n` +
        `🔧 *Prefix:* \`${botSettings.prefix}\`\n` +
        `⚙️ *Mode:* ${botSettings.mode.toUpperCase()}\n\n` +
        `> 🐍 *Venom MD* | Made by *Taprush EMP*`
      );
      return true;
    }

    case "ping": {
      const start = Date.now();
      await reply(sock, msg, "🏓 Pinging...");
      const end = Date.now();
      await reply(sock, msg, `🏓 *Pong!*\n⚡ Response: *${end - start}ms*`);
      return true;
    }

    case "info": {
      const info = `╔══════════════════════╗
║   🐍 *VENOM MD INFO*  ║
╚══════════════════════╝

🤖 *Bot:* ${BOT_CONFIG.name}
👨‍💻 *Author:* ${BOT_CONFIG.author}
🔢 *Version:* ${BOT_CONFIG.version}
🔧 *Prefix:* \`${botSettings.prefix}\`
🌐 *Platform:* ${os.platform()} ${os.arch()}
💾 *RAM:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
⚡ *Mode:* ${botSettings.mode.toUpperCase()}
📦 *Node:* ${process.version}
📊 *Groups Tracked:* ${groupSettings.size}
👥 *Users Tracked:* ${userEconomy.size}

> 🐍 Powered by *Baileys*`;
      await reply(sock, msg, info);
      return true;
    }

    case "runtime": {
      const uptime = Date.now() - startTime;
      const s = Math.floor(uptime / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      const formatted = `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
      await reply(
        sock,
        msg,
        `⏱️ *Runtime*\n\n🐍 Venom MD has been running for:\n*${formatted}*`
      );
      return true;
    }

    case "stats": {
      const stats = `📊 *VENOM MD STATS*

🏠 *Groups:* ${groupSettings.size}
👥 *Users:* ${userEconomy.size}
⏱️ *Uptime:* ${Math.floor((Date.now() - startTime) / 60000)}m
💾 *Memory:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
🔧 *Mode:* ${botSettings.mode.toUpperCase()}
🛡️ *Blocked:* ${botSettings.blockedUsers.size} users`;
      await reply(sock, msg, stats);
      return true;
    }

    default:
      return false;
  }
}
